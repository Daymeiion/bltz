"use client";
import EditorialImageInput from "./EditorialImageInput";
import HeadshotFields, { type HeadshotTarget } from "./HeadshotFields";
import { PreviewSavedContext } from "./PreviewSavedContext";
import { PfrJerseyImport } from "./PfrJerseyImport";
import { reviewPfrJerseys } from "@/lib/preview-lockers/jersey-review";
import { z } from "zod";

import { useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { previewContent, previewIdentity, previewStatKeys, previewStatLabels, slugify, type PreviewContent, type PreviewMediaMime, type PreviewRecord } from "@/lib/preview-lockers/validation";
import { previewEnrollment } from "@/lib/preview-lockers/conversion";
import { readDiscovery } from "@/lib/preview-lockers/stream-client";
import { mergeSuggestions } from "@/lib/preview-lockers/merge-suggestions";
import { SportradarPanel } from "./[id]/edit/SportradarPanel";
import PreviewViewerAccess from "./PreviewViewerAccess";
import styles from "./preview-form.module.css";
import AwardsSection from "./AwardsSection";
import EnrichmentPanel from "./EnrichmentPanel";
import type { EnrichmentReport, AwardEnrichmentReport } from "@/lib/preview-lockers/enrichment";
import SocialSection from "./SocialSection";
import ArticlesSection from "./ArticlesSection";
import MerchandiseSection from "./MerchandiseSection";
import type { MerchandiseResult } from "@/lib/enrichment/merchandise";
import { merchandiseQueueResultSchema, merchandiseReviewSchema, visibleMerchandiseReview, dismissedMerchandiseItems, type MerchandiseReview } from "@/lib/preview-lockers/merchandise-review";
import type { PlayerArticle } from "@/lib/enrichment/news";
import { newsReviewSchema, newsReviewArticleSchema, type NewsReview } from "@/lib/preview-lockers/news-review";
import { searchErrorMessage } from "@/lib/search/errors";
import CfbCsvImport from "./CfbCsvImport";
import CombineResultsForm from "./CombineResultsForm";
import type { CombineSearchHandle } from "./CombineSearchReview";
import BuildAllPanel from "./BuildAllPanel";
import { awardsOutcome, failedRetryable, initialBuildStatus, newsProblem, skipRemaining, type BuildStatus, type BuildTask, type BuildTaskState, type RetryableTask } from "@/lib/preview-lockers/build-all";
import StatsCsvImport from "./StatsCsvImport";
import { BuilderSection } from "./BuilderSection";
import { previewVideoCategories, previewVideoLevel } from "@/lib/preview-lockers/video";
import { MediaSection, MediaItem } from "./MediaDisclosure";
import { createClient } from "@/lib/supabase/client";
import { parseYouTubeBatch } from "@/lib/preview-lockers/youtube-bulk";

const initial = () => previewContent.parse({ slug: "private-preview", full_name: "".padEnd(2, "_") });
// Career search context can change without changing the athlete in this editor.
const newsAthleteIdentity = (content: PreviewContent) => content.full_name.trim().toLowerCase();
const merchandiseIdentity = (content: PreviewContent) => JSON.stringify([content.full_name, content.school, content.position, content.schools.map(item => item.label), content.pro_teams.map(item => item.label)]);
type SaveResponse = { id: string; slug: string; revision: number; complete?: boolean; completionStatus?: string; enrolled?: boolean; enrichment?: EnrichmentReport | { status: "unavailable"; errors: string[] } };
type Scalar = Exclude<keyof PreviewContent, "schools" | "pro_teams" | "awards" | "social" | "article_edits" | "merchandise" | "career_stats" | "cfb_stats" | "pfr_stats" | "combine_results" | "videos" | "photos">;

export default function PreviewLockerForm({
  record,
  initialEnrichmentReport = null,
  initialEnrichmentRevision,
  initialArticles = [],
  initialNewsReview = null,
  newsReviewCurrent = true,
  newsReviewError = "",
  initialMerchandiseReview = null,
  merchandiseReviewCurrent = true,
  merchandiseReviewError = "",
  initialImageUrls = {},
  enrollmentEnabled = false,
  enrollmentContacts = [],
  reservedId,
  referralName,
  viewerAssigned = false,
  gtmLinked = false,
  gtmCompleted = false,
  reviewIdentity = false,
}: {
  record?: PreviewRecord;
  initialEnrichmentReport?: EnrichmentReport | null;
  initialEnrichmentRevision?: number;
  initialArticles?: PlayerArticle[];
  initialNewsReview?: NewsReview | null;
  newsReviewCurrent?: boolean;
  newsReviewError?: string;
  initialMerchandiseReview?: MerchandiseReview | null;
  merchandiseReviewCurrent?: boolean;
  merchandiseReviewError?: string;
  initialImageUrls?: Record<string, string>;
  enrollmentEnabled?: boolean;
  enrollmentContacts?: {id:string;label:string}[];
  reservedId?: string;
  referralName?: string;
  viewerAssigned?: boolean;
  gtmLinked?: boolean;
  gtmCompleted?: boolean;
  reviewIdentity?: boolean;
}) {
  const onPreviewSaved = useContext(PreviewSavedContext);
  const [activeFolder, setActiveFolder] = useState(reviewIdentity ? "stats" : "info");
  const [enroll, setEnroll] = useState(enrollmentEnabled && !record && !reservedId);
  const [enrollment, setEnrollment] = useState({contact_id:"",campaign:"",source:"",channel:"email",relationship:"warm",is_test:false});
  const [draft, setDraft] = useState<PreviewContent>(() => record ? previewContent.parse(Object.fromEntries(Object.keys(previewContent.shape).map(k => [k, record[k as keyof PreviewRecord]]))) : { ...initial(), full_name: referralName ?? "", slug: "" });
  const [busy, setBusy] = useState<"discovery" | "build" | "upload" | "save" | "complete" | "stats" | "combine" | "awards" | "news" | "merchandise" | null>(null);
  const [build, setBuild] = useState<BuildStatus | null>(null);
  const combineSearch = useRef<CombineSearchHandle>(null);
  const [awardsReport, setAwardsReport] = useState<AwardEnrichmentReport | null>(() => initialEnrichmentReport?.last_awards_attempt !== undefined ? initialEnrichmentReport.last_awards_attempt : initialEnrichmentReport && initialEnrichmentRevision ? {
    status: initialEnrichmentReport.errors.includes("awards_unavailable") ? "unavailable" : "complete",
    awards_discovered: initialEnrichmentReport.awards_discovered, awards_normalized: initialEnrichmentReport.awards_normalized,
    unmapped_awards: initialEnrichmentReport.unmapped_awards, errors: initialEnrichmentReport.errors.filter(code => code.startsWith("awards_")),
    updated_at: initialEnrichmentReport.updated_at, source_revision: initialEnrichmentRevision,
  } : null);
  const [awardsError, setAwardsError] = useState("");
  const [merchandiseSearch, setMerchandiseSearch] = useState<{ result: MerchandiseResult; identity: string; key: string; review?: MerchandiseReview } | null>(() => initialMerchandiseReview ? { result: visibleMerchandiseReview(initialMerchandiseReview), identity: record && merchandiseReviewCurrent ? merchandiseIdentity(record) : "", key: `saved-${initialMerchandiseReview.version}`, review: initialMerchandiseReview } : null);
  const [merchandiseError, setMerchandiseError] = useState(merchandiseReviewError);
  const [editorialImages, setEditorialImages] = useState(initialImageUrls);
  const [editorialImageError, setEditorialImageError] = useState<{kind:"article"|"merchandise"|"school_logo";id:string;message:string}|null>(null);
  const [dismissingMerchandise, setDismissingMerchandise] = useState(false);
  const [newsArticles, setNewsArticles] = useState(initialArticles);
  const [newsReview, setNewsReview] = useState<{ review: NewsReview; identity: string; searchContext: string; key: string } | null>(() => initialNewsReview ? { review: initialNewsReview, identity: record && newsReviewCurrent ? newsAthleteIdentity(record) : "", searchContext: record ? merchandiseIdentity(record) : "", key: "saved-" + initialNewsReview.version } : null);
  const [newsError, setNewsError] = useState(newsReviewError);
  const [showStats, setShowStats] = useState(reviewIdentity);
  const [statsNeedReload, setStatsNeedReload] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saveVersionConflict, setSaveVersionConflict] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [completionReviewed, setCompletionReviewed] = useState(false);
  const [completed, setCompleted] = useState(gtmCompleted);
  const [touched, setDirty] = useState(false);
  const [leaveHref, setLeaveHref] = useState<string | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [youtubeBatch, setYoutubeBatch] = useState("");
  const [removalKind, setRemovalKind] = useState<"photo" | "video" | null>(null);
  const [saved, setSaved] = useState<{ id: string; slug: string; revision: number } | null>(record ?? null);
  const savedDraft = useRef(JSON.stringify(draft));
  const initialEnrollment = useRef(JSON.stringify({enroll,enrollment}));
  const dirty = touched && (JSON.stringify(draft) !== savedDraft.current || (!saved && JSON.stringify({enroll,enrollment}) !== initialEnrollment.current));
  const revision = useRef(record?.revision);
  const createId = useRef<string | null>(reservedId ?? null);
  const pending = useRef(false);
  const abort = useRef<AbortController | null>(null);
  const allowDraftDiscard = useRef(false);
  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => {
    const departureProtected = dirty || busy !== null;
    if (!departureProtected) { allowDraftDiscard.current = false; return; }
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (allowDraftDiscard.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const guardNavigation = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!target || target.target === "_blank" || target.hasAttribute("download")) return;
      if (target.dataset.draftDiscard === "true" && !busy) { allowDraftDiscard.current = true; return; }
      event.preventDefault();
      event.stopPropagation();
      if (!busy) { setLeaveHref(target.href); return; }
      setMessage(busy === "discovery" || busy === "build"
        ? "Discovery is still running in this editor. Wait for it to finish or cancel it before leaving; navigating away would stop the admitted run."
        : busy
          ? "A private preview update is still being saved. Wait for it to finish before leaving."
          : "Unsaved scraped or manual changes are still in this editor. Review and save them, or explicitly reload the saved version to discard them, before leaving.");
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", guardNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", guardNavigation, true);
    };
  }, [dirty, busy]);
  function change(patch: Partial<PreviewContent> | ((current: PreviewContent) => Partial<PreviewContent>)) { setDraft(current => ({ ...current, ...(typeof patch === "function" ? patch(current) : patch) })); setReviewed(false); setCompletionReviewed(false); setDirty(true); setError(""); }
  function toggleSelection(kind: "photo" | "video", id: string, selected: boolean) {
    const update = kind === "photo" ? setSelectedPhotos : setSelectedVideos;
    update(current => selected ? [...current.filter(value => value !== id), id] : current.filter(value => value !== id));
  }
  function removeMedia(kind: "photo" | "video", ids: string[]) {
    const removed = new Set(ids);
    if (kind === "photo") {
      change({
        photos: draft.photos.filter(photo => !removed.has(photo.id)),
        awards: draft.awards.map(award => removed.has(award.photoId ?? "") ? { ...award, photoId: null } : award),
        social: draft.social.map(item => removed.has(item.photoId ?? "") ? { ...item, photoId: null } : item),
      });
      setSelectedPhotos(current => current.filter(id => !removed.has(id)));
    } else {
      change({ videos: draft.videos.filter(video => !removed.has(video.id)), social: draft.social.map(item => removed.has(item.videoId ?? "") ? { ...item, videoId: null } : item) });
      setSelectedVideos(current => current.filter(id => !removed.has(id)));
    }
    setRemovalKind(null);
    setMessage(`${ids.length} ${kind}${ids.length === 1 ? "" : "s"} removed from this draft. Save the draft to apply the change.`);
  }
  function field(key: Scalar, label: string, maxLength = 160, numeric = false) {
    return <label className="grid gap-2 text-sm" key={key}>{label}<Input aria-label={label} maxLength={maxLength} type={key === "dob" ? "date" : numeric ? "number" : "text"} max={key === "dob" ? new Date().toISOString().slice(0, 10) : undefined} min={key === "dob" ? "1850-01-01" : undefined} value={draft[key] ?? ""} onChange={event => change({ [key]: numeric ? event.target.value === "" ? null : Number(event.target.value) : event.target.value || null })} /></label>;
  }
  async function discover(jerseysOnly = false) {
    if (pending.current) return;
    const identity = previewIdentity.safeParse({ full_name: draft.full_name, school: draft.school, position: draft.position, level: draft.level });
    if (!identity.success) { setError("Enter a name of at least two characters before discovery."); return; }
    pending.current = true; setBusy("discovery"); setError(""); setMessage("Searching existing sources…");
    const controller = new AbortController(); abort.current = controller;
    try {
      const result = await readDiscovery(await fetch("/api/preview-lockers/discovery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(identity.data), signal: controller.signal }), setMessage);
      if (!controller.signal.aborted) {
        if (result.draft) { const suggestion = result.draft; setDraft(current => { const merged = mergeSuggestions(current, suggestion); return jerseysOnly ? { ...current, schools: merged.schools, pro_teams: merged.pro_teams } : merged; }); setReviewed(false); setCompletionReviewed(false); setDirty(true); }
        setMessage(result.message);
      }
    } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Discovery unavailable. Continue manually."); }
    finally { pending.current = false; setBusy(null); abort.current = null; }
  }
  // One owner for the whole run: career search, one private save, then the
  // searches that need that saved revision, in parallel. Nothing is auto-added.
  async function buildAll() {
    if (pending.current) return;
    if (statsNeedReload) { setError("Preview identity or statistics updated. Reload the saved version before building."); return; }
    const identity = previewIdentity.safeParse({ full_name: draft.full_name, school: draft.school, position: draft.position, level: draft.level });
    if (!identity.success) { setError("Enter a name of at least two characters before building."); return; }
    pending.current = true; setBusy("build"); setError(""); setMessage(""); setSaveVersionConflict(false);
    const controller = new AbortController(); abort.current = controller;
    const { signal } = controller;
    let status = initialBuildStatus();
    const mark = (task: BuildTask, state: BuildTaskState, detail: string) => { status = { ...status, [task]: { state, detail } }; setBuild(status); };
    const stop = (detail: string) => { status = skipRemaining(status, detail); setBuild(status); };
    setBuild(status);
    try {
      mark("career", "running", "Searching career sources…");
      let content = draft;
      try {
        const result = await readDiscovery(await fetch("/api/preview-lockers/discovery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(identity.data), signal }), text => mark("career", "running", text));
        if (signal.aborted) return;
        if (result.draft) { content = mergeSuggestions(draft, result.draft); setDraft(content); setReviewed(false); setCompletionReviewed(false); setDirty(true); }
        mark("career", "done", result.draft ? "Suggestions filled blank fields. Your existing entries were kept." : result.message);
      } catch (cause) {
        if (signal.aborted) return;
        mark("career", "failed", cause instanceof Error ? cause.message : "Career search unavailable.");
        stop("Not started because the career search failed.");
        return;
      }
      const parsed = previewContent.safeParse(content);
      if (!parsed.success) {
        mark("save", "failed", `Fix these fields, then save: ${parsed.error.issues.map(issue => issue.path.join(".")).slice(0, 5).join(", ")}.`);
        stop("Not started because the draft could not be saved.");
        return;
      }
      mark("save", "running", "Saving private draft…");
      mark("awards", "running", "Mapping awards during save…");
      mark("news", "running", "Searching news during save…");
      let data: SaveResponse;
      // Never abort a save mid-request: its outcome would be unknown.
      try { data = await persistDraft(parsed.data, null, true); }
      catch (cause) {
        mark("save", "failed", cause instanceof Error ? cause.message : "Save failed. Your draft is retained.");
        stop("Not started because the draft was not saved.");
        return;
      }
      mark("save", "done", `Private draft saved (revision ${data.revision}).`);
      const awards = awardsOutcome(data.enrichment);
      if (awards.attempt) setAwardsReport(awards.attempt);
      mark("awards", awards.ok ? "done" : "failed", awards.detail);
      if (signal.aborted) return;
      const news = newsProblem(data.enrichment);
      await runSearches(data.id, parsed.data, signal, ["news", "merchandise", "combine"], news.fatal ? news.message : "", news.fatal ? "" : news.message, mark);
    } finally {
      if (signal.aborted) stop("Cancelled. Finished results were kept.");
      pending.current = false; setBusy(null); abort.current = null;
    }
  }
  /** The saved-revision searches. A news search that already ran during save is only loaded, not repeated. */
  async function runSearches(id: string, content: PreviewContent, signal: AbortSignal, tasks: readonly RetryableTask[], newsFailure: string | null, newsWarning: string, mark: (task: BuildTask, state: BuildTaskState, detail: string) => void) {
    const failed = (task: BuildTask, cause: unknown, fallback: string) => { if (!signal.aborted) mark(task, "failed", cause instanceof Error ? cause.message : fallback); };
    await Promise.all([
      tasks.includes("news") && (async () => {
        mark("news", "running", newsFailure === null ? "Searching news…" : "Loading news results…");
        try {
          const problem = newsFailure ?? await refreshSavedNews(id, signal);
          const loaded = await fetchSavedNews(id, content, 0, signal);
          if (problem) mark("news", "failed", problem);
          else mark("news", "done", `${loaded.pending} article${loaded.pending === 1 ? "" : "s"} awaiting review.${newsWarning ? ` ${newsWarning}` : ""}`);
        } catch (cause) { failed("news", cause, "News could not be loaded."); }
      })(),
      tasks.includes("merchandise") && (async () => {
        mark("merchandise", "running", "Searching cards, jerseys and listings…");
        try {
          const result = await runMerchandiseSearch(id, content, signal);
          mark("merchandise", "done", `${result.pending} listing${result.pending === 1 ? "" : "s"} awaiting review.${result.warning ? ` ${result.warning}` : ""}`);
        } catch (cause) { failed("merchandise", cause, "Merchandise search is unavailable."); }
      })(),
      tasks.includes("combine") && (async () => {
        mark("combine", "running", "Searching Combine sources…");
        const search = combineSearch.current;
        if (!search) { mark("combine", "failed", "Combine search is unavailable in this editor."); return; }
        const outcome = await search.search({ id, revision: revision.current! }, signal);
        if (signal.aborted) return;
        mark("combine", outcome.ok ? "done" : "failed", outcome.ok ? `${outcome.found} source suggestion${outcome.found === 1 ? "" : "s"} to review. ${outcome.message}` : outcome.message);
      })(),
    ]);
  }
  async function retryBuild() {
    const tasks = failedRetryable(build);
    if (pending.current || !saved || dirty || !tasks.length) return;
    pending.current = true; setBusy("build"); setError("");
    const controller = new AbortController(); abort.current = controller;
    let status = { ...build!, ...Object.fromEntries(tasks.map(task => [task, { state: "waiting", detail: "Waiting" }])) } as BuildStatus;
    const mark = (task: BuildTask, state: BuildTaskState, detail: string) => { status = { ...status, [task]: { state, detail } }; setBuild(status); };
    setBuild(status);
    try { await runSearches(saved.id, draft, controller.signal, tasks, null, "", mark); }
    finally {
      if (controller.signal.aborted) { status = skipRemaining(status, "Cancelled. Finished results were kept."); setBuild(status); }
      pending.current = false; setBusy(null); abort.current = null;
    }
  }
  async function save(asDraft = false) {
    if (statsNeedReload) { setError("Preview identity or statistics updated. Reload the saved version before making further edits."); return; }
    if (pending.current || (!asDraft && !reviewed)) return;
    const parsed = previewContent.safeParse(draft);
    if (!parsed.success) { setError(parsed.error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`).slice(0, 5).join("; ")); return; }
    const enrollmentData = !asDraft && !saved && enroll ? previewEnrollment.safeParse(enrollment) : null;
    if (enrollmentData && !enrollmentData.success) { setError("Choose a GTM contact and enter campaign and source codes (letters, numbers, hyphens or underscores)."); return; }
    pending.current = true; setBusy("save"); setError(""); setSaveVersionConflict(false);
    try {
      const data = await persistDraft(parsed.data, enrollmentData?.success ? enrollmentData.data : null);
      setMessage(asDraft ? "Draft saved privately. You can close this editor and resume from the preview list. No new enrollment or completion was recorded." : data.completionStatus === "unavailable"
        ? "Saved privately. Completion status could not be refreshed; reload before marking this preview complete."
        : data.enrolled ? "Preview created and enrolled in the conversion funnel. Publish its reviewed invite link before outreach; players will not need to sign in." : "Saved privately as a draft. Publish its reviewed invite link when it is ready to share.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Save failed. Your draft is retained."); }
    finally { pending.current = false; setBusy(null); }
  }
  /** Saves one snapshot. Callers own pending/busy. refreshNews asks an existing preview's save to search news too. */
  async function persistDraft(content: PreviewContent, enrollment: z.infer<typeof previewEnrollment> | null, refreshNews = false): Promise<SaveResponse> {
    createId.current ??= crypto.randomUUID();
    const response = await fetch(saved ? `/api/preview-lockers/${saved.id}` : "/api/preview-lockers", {
      method: saved ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(saved ? { revision: revision.current, content, ...(refreshNews ? { refreshNews: true } : {}) } : { id: createId.current, content, ...(enrollment ? { enrollment } : {}) }),
    });
    if (!response.ok) {
      const failure = await response.json().catch(() => null);
      if (failure?.error === "source_policy_blocked") throw new Error("This statistics source is reference-only. Keep or remove previously saved imports; new or changed imports cannot be saved. Your draft is retained.");
      if (response.status === 409) {
        if (failure?.error === "slug_conflict") throw new Error("Save conflict: that private URL slug is already used by another Locker. Choose a different slug and save again. Your draft is retained.");
        if (saved) {
          setSaveVersionConflict(true);
          throw new Error("Save conflict: A newer version of this Locker is already saved. Open the latest saved version in a new tab, review it, and copy over your unsaved changes before saving there. Keep this tab open until your changes are saved.");
        }
        throw new Error("Save conflict: this slug or GTM contact may already be linked, or enrollment details changed. Your draft is retained. Open the saved list in a new tab to find the existing Locker before retrying.");
      }
      throw new Error(response.status === 401 || response.status === 403 ? "Your Admin session is no longer authorized. Sign in again before saving." : "Save failed. Your draft is retained; retry is safe.");
    }
    const data = await response.json() as SaveResponse; savedDraft.current = JSON.stringify(content); setSaved({ id: data.id, slug: data.slug, revision: data.revision }); onPreviewSaved?.(data.slug); revision.current = data.revision; setReviewed(false); setCompletionReviewed(false); setDirty(false);
    if (gtmLinked) setCompleted(data.complete === true);
    return data;
  }
  async function completePreview() {
    if (pending.current || !saved || !gtmLinked || !completionReviewed || dirty) return;
    pending.current = true; setBusy("complete"); setError("");
    try {
      const response = await fetch(`/api/preview-lockers/${saved.id}/completion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revision: revision.current }),
      });
      if (!response.ok) throw new Error(response.status === 409 ? "Completion conflict: this preview changed. Reload the saved version, review it, and try again." : response.status === 401 || response.status === 403 ? "Your Admin session is no longer authorized. Sign in again before completing this preview." : "Completion could not be saved. The preview remains draft / incomplete.");
      setCompleted(true); setCompletionReviewed(false);
      setMessage("Preview complete. This confirms private-demo review only; identity and media rights remain unverified.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Completion could not be saved. The preview remains draft / incomplete."); }
    finally { pending.current = false; setBusy(null); }
  }
  async function refreshAwards() {
    if (pending.current || !saved || dirty) return;
    pending.current = true; setBusy("awards"); setAwardsError("");
    try {
      const response = await fetch(`/api/preview-lockers/${saved.id}/awards`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision: revision.current }) });
      const body = await response.json();
      if (!response.ok) throw new Error(response.status === 409 ? "This preview changed. Reload the saved version before refreshing awards. Your draft is retained." : response.status === 401 || response.status === 403 ? "Your Admin session is no longer authorized to refresh awards." : "Awards enrichment is unavailable. Previous saved results are retained.");
      if (!body.report?.last_awards_attempt || body.report.errors?.some((code: string) => ["preview_changed", "enrichment_not_saved"].includes(code))) throw new Error("Awards enrichment could not be saved. Previous results are retained.");
      setAwardsReport(body.report.last_awards_attempt);
    } catch (cause) { setAwardsError(cause instanceof Error ? cause.message : "Awards enrichment is unavailable. Previous saved results are retained."); }
    finally { pending.current = false; setBusy(null); }
  }
  async function loadNews(refresh = false, dismissedOffset = 0) {
    if (pending.current || !saved || dirty) return;
    pending.current = true; setBusy("news"); setError(""); setNewsError(""); setMessage("");
    try {
      let refreshError = "";
      if (refresh) refreshError = await refreshSavedNews(saved.id);
      const loaded = await fetchSavedNews(saved.id, draft, dismissedOffset);
      setMessage(`Loaded ${loaded.articles} saved matching articles. Your manual additions, edits and hidden choices are unchanged.`);
      if (refreshError) setNewsError(refreshError);
    } catch (cause) { setNewsError(cause instanceof Error ? cause.message : "News could not be loaded. Your draft is retained."); }
    finally { pending.current = false; setBusy(null); }
  }
  /** Loads the saved article list and review queue. Callers own pending/busy. */
  async function fetchSavedNews(id: string, content: PreviewContent, dismissedOffset = 0, signal?: AbortSignal) {
    const response = await fetch(`/api/preview-lockers/${id}/news${dismissedOffset ? `?dismissedOffset=${dismissedOffset}` : ""}`, { cache: "no-store", signal });
    if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "Your Admin session is no longer authorized to load articles." : "Saved articles could not be loaded. Your draft is retained.");
    const body = await response.json();
    if (body.revision !== revision.current) { setNewsReview(current => current ? { ...current, identity: "" } : null); throw new Error("This preview changed. Reload the saved version before refreshing articles. Your draft is retained."); }
    const articles = z.array(newsReviewArticleSchema).max(24).safeParse(body.articles), review = newsReviewSchema.safeParse(body.review);
    if (!articles.success || !review.success) throw new Error("The article list was unavailable. Your draft and previous reviews are retained.");
    setNewsArticles(articles.data);
    setNewsReview({ review: review.data, identity: newsAthleteIdentity(content), searchContext: merchandiseIdentity(content), key: crypto.randomUUID() });
    return { articles: articles.data.length, pending: review.data.articles.length };
  }
  /** Runs a news search for the saved revision. Returns a readable problem, or "" when it succeeded. */
  async function refreshSavedNews(id: string, signal?: AbortSignal): Promise<string> {
    const response = await fetch(`/api/preview-lockers/${id}/news`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision: revision.current }), signal });
    const body = await response.json();
    if (response.status === 409) { setNewsReview(current => current ? { ...current, identity: "" } : null); throw new Error("This preview changed. Reload the saved version before searching news. Your draft is retained."); }
    return response.ok ? "" : [...(body.report?.errors ?? []), body.error].map((code: string) => searchErrorMessage(code)).filter(Boolean).join(" ") || "News refresh is unavailable. Previously saved articles are retained.";
  }
  async function dismissNews(url: string | string[], restore = false): Promise<boolean> {
    if (pending.current || !saved || !newsReview) return false;
    pending.current = true; setBusy("news"); setNewsError("");
    try {
      const response = await fetch("/api/preview-lockers/" + saved.id + "/news", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision: revision.current, version: newsReview.review.version, ...(restore ? { action: "restore" } : {}), ...(Array.isArray(url) ? { urls: url } : { url }) }) });
      const body = await response.json(), review = newsReviewSchema.safeParse(body.review);
      if (!response.ok || !review.success || body.revision !== revision.current) throw new Error(response.status === 409 ? "The saved news review queue changed. Reopen this preview before reviewing an article. Your draft is retained." : response.status === 422 ? "The news review queue is full. Dismiss other suggestions before restoring this article." : "The article review change could not be saved. Your saved article and draft are retained.");
      setNewsReview(current => current ? { ...current, review: review.data, key: crypto.randomUUID() } : null);
      setMessage(restore ? `${Array.isArray(url) ? url.length + " articles" : "Article"} restored to the saved review queue. Review before adding to the Locker.` : "Article dismissal saved.");
      return true;
    } catch (cause) { setNewsError(cause instanceof Error ? cause.message : "The article dismissal could not be saved."); return false; }
    finally { pending.current = false; setBusy(null); }
  }
  async function searchMerchandise() {
    if (pending.current || !saved || dirty) return;
    pending.current = true; setBusy("merchandise"); setMerchandiseError("");
    try { setMerchandiseError((await runMerchandiseSearch(saved.id, draft)).warning); }
    catch (cause) { setMerchandiseError(cause instanceof Error ? cause.message : "Merchandise search is unavailable. Your draft is retained."); }
    finally { pending.current = false; setBusy(null); }
  }
  /** Searches and saves the merchandise review queue for the saved revision. Callers own pending/busy. */
  async function runMerchandiseSearch(id: string, content: PreviewContent, signal?: AbortSignal) {
    const explain = (codes: string[]) => codes.map(code => searchErrorMessage(code)?.replace(/\bnews\b/gi, "merchandise")).filter(Boolean).join(" ");
    const response = await fetch(`/api/preview-lockers/${id}/merchandise`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision: revision.current }), signal });
    const body = await response.json();
    if (response.status === 409 || (response.ok && body.revision !== revision.current)) setMerchandiseSearch(current => current ? { ...current, identity: "" } : null);
    if (!response.ok) throw new Error(response.status === 409 ? "This preview changed. Reload the saved version before searching merchandise. Your draft is retained." : response.status === 401 || response.status === 403 ? "Your Admin session is no longer authorized to search merchandise." : explain([...(Array.isArray(body.result?.errors) ? body.result.errors : []), body.error]) || "Merchandise search is unavailable. Previous results and your draft are retained.");
    if (body.revision !== revision.current) throw new Error("This preview changed. Reload the saved version before adding search results.");
    const parsed = merchandiseQueueResultSchema.safeParse(body.result);
    if (!parsed.success) throw new Error("The merchandise search response was invalid. Previous results and your draft are retained.");
    const review = merchandiseReviewSchema.safeParse(body.review);
    if (!review.success) throw new Error("Search results could not be saved. Previous saved results and your draft are retained.");
    const visible = visibleMerchandiseReview(review.data);
    setMerchandiseSearch({ result: visible, identity: merchandiseIdentity(content), key: crypto.randomUUID(), review: review.data });
    return { pending: visible.items.length, warning: explain(parsed.data.errors) };
  }
  async function dismissMerchandise(url: string | string[], restore = false): Promise<boolean> {
    if (pending.current || !saved || !merchandiseSearch?.review) return false;
    pending.current = true; setBusy("merchandise"); setDismissingMerchandise(true); setMerchandiseError("");
    try {
      const response = await fetch(`/api/preview-lockers/${saved.id}/merchandise`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision: revision.current, version: merchandiseSearch.review.version, ...(restore ? { action: "restore" } : {}), ...(Array.isArray(url) ? { urls: url } : { url }) }) });
      const body = await response.json(); const review = merchandiseReviewSchema.safeParse(body.review);
      if (!response.ok || !review.success || body.revision !== revision.current) throw new Error(response.status === 409 ? "The saved review queue changed. Reopen this preview before reviewing a listing. Your draft is retained." : response.status === 422 ? "The merchandise review queue is full. Dismiss other suggestions before restoring this listing." : "The review change could not be saved. The listing and your draft are retained.");
      setMerchandiseSearch(current => current ? { ...current, result: visibleMerchandiseReview(review.data), review: review.data, key: crypto.randomUUID() } : null);
      setMessage(restore ? `${Array.isArray(url) ? url.length + " listings" : "Listing"} restored to the saved review queue. Review before adding to the Locker.` : "Listing dismissal saved.");
      return true;
    } catch (cause) { setMerchandiseError(cause instanceof Error ? cause.message : "The dismissal could not be saved."); return false; }
    finally { pending.current = false; setBusy(null); setDismissingMerchandise(false); }
  }
  async function uploadFiles(kind: "photo" | "video", files: FileList | null, placement?: { award?: number; social?: string }) {
    if (!files?.length || !saved || pending.current) return;
    const limit = kind === "photo" ? 40 : 24;
    const names = new Set((kind === "photo" ? draft.photos : draft.videos).map(item => item.title.trim().toLocaleLowerCase()));
    const duplicates: string[] = [];
    const unique = Array.from(files).filter(file => {
      const title = file.name.replace(/\.[^.]+$/, "").trim().toLocaleLowerCase();
      if (names.has(title)) { duplicates.push(file.name); return false; }
      names.add(title);
      return true;
    });
    const selected = unique.slice(0, Math.max(0, limit - (kind === "photo" ? draft.photos.length : draft.videos.length)));
    const duplicateNotice = `Skipped ${duplicates.length} same-name ${kind}${duplicates.length === 1 ? "" : "s"}: ${duplicates.slice(0, 3).join(", ")}${duplicates.length > 3 ? "…" : ""}. Remove the old draft item first if this is its JPEG replacement.`;
    if (duplicates.length && !selected.length) setError(duplicateNotice);
    if (!selected.length) { if (!duplicates.length) setError(`${kind === "photo" ? "Photo" : "Video"} limit reached.`); return; }
    pending.current = true; setBusy("upload"); setError(""); setMessage(`Uploading ${selected.length} ${kind}${selected.length === 1 ? "" : "s"} privately…`);
    const uploaded: Array<{ id: string; title: string; storagePath: string; mimeType: PreviewMediaMime }> = [];
    const retainUploaded = () => {
      if (!uploaded.length) return;
      const attachment: Partial<PreviewContent> = placement?.award !== undefined ? { awards: draft.awards.map((award, i) => i === placement.award ? { ...award, photoId: uploaded[0].id, imageAssetId: null, imageMode: "custom" as const } : award) } : placement?.social ? { social: draft.social.map(item => item.id === placement.social ? { ...item, [kind === "photo" ? "photoId" : "videoId"]: uploaded[0].id } : item) } : {};
      if (kind === "photo") change({ ...attachment, photos: [...draft.photos, ...uploaded.map(item => ({ ...item, ...(placement ? { inHeroSlideshow: false } : {}), credits: null, sourceUrl: null, level: "off-field" as const, season: null }))] });
      else change({ ...attachment, videos: [...draft.videos, ...uploaded.map(item => ({ ...item, thumb: null }))] });
    };
    try {
      const storage = createClient().storage;
      for (const file of selected) {
        const response = await fetch(`/api/preview-lockers/${saved.id}/uploads`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, mimeType: file.type, size: file.size }) });
        if (!response.ok) throw new Error(response.status === 400 ? `${file.name} is not an allowed ${kind} type or exceeds the size limit.` : `Could not prepare ${file.name} for private upload.`);
        const ticket = await response.json() as { path: string; token: string; bucket: string };
        const result = await storage.from(ticket.bucket).uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
        if (result.error) throw new Error(`Upload failed for ${file.name}.`);
        uploaded.push({ id: crypto.randomUUID(), title: file.name.replace(/\.[^.]+$/, "").slice(0, 160) || "Uploaded media", storagePath: ticket.path, mimeType: file.type as PreviewMediaMime });
      }
      retainUploaded();
      setMessage(`${uploaded.length} private ${kind}${uploaded.length === 1 ? "" : "s"} uploaded into this draft. Review metadata, then save the draft.${duplicates.length ? ` ${duplicateNotice}` : ""}`);
    } catch (cause) {
      retainUploaded();
      setError(`${cause instanceof Error ? cause.message : "Private upload failed."}${uploaded.length ? ` ${uploaded.length} completed upload${uploaded.length === 1 ? " was" : "s were"} retained in this draft.` : ""}`);
    } finally { pending.current = false; setBusy(null); }
  }
  async function uploadEditorialImage(kind: "article" | "merchandise" | "school_logo", id: string, file: File | undefined, article?: PreviewContent["article_edits"][number]) {
    if (!file || !saved || pending.current) return;
    setEditorialImageError(null);
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || !file.size || file.size > 10 * 1024 * 1024) {
      setEditorialImageError({kind,id,message:"Choose a JPG, PNG or WebP image, up to 10 MB."}); return;
    }
    pending.current = true; setBusy("upload");
    try {
      const response = await fetch(`/api/preview-lockers/${saved.id}/uploads`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, mimeType: file.type, size: file.size }) });
      if (!response.ok) throw new Error("Could not prepare this image. Try again.");
      const ticket = await response.json() as {path:string;token:string;bucket:string};
      const bucket = createClient().storage.from(ticket.bucket);
      const upload = await bucket.uploadToSignedUrl(ticket.path, ticket.token, file, {contentType:file.type});
      if (upload.error) throw new Error("Image upload failed. Your current image is unchanged.");
      const preview = await bucket.createSignedUrl(ticket.path, 900);
      if (preview.error || !preview.data?.signedUrl) throw new Error("Could not finish this image upload. Try again.");
      setEditorialImages(current => ({...current,[ticket.path]:preview.data.signedUrl}));
      change(current => {
        if (kind === "school_logo") return {schools:current.schools.map((team,index) => index === Number(id) ? {...team,logoStoragePath:ticket.path} : team)};
        if (kind === "merchandise") return {merchandise:current.merchandise.map(item => item.id === id ? {...item,imageStoragePath:ticket.path} : item)};
        const existing=current.article_edits.find(item=>item.id===article!.id || !!article!.sourceUrl && item.sourceUrl===article!.sourceUrl);
        return {article_edits:existing?current.article_edits.map(item=>item.id===existing.id?{...item,imageStoragePath:ticket.path}:item):[...current.article_edits,{...article!,imageStoragePath:ticket.path}]};
      });
      setMessage(`${kind === "school_logo" ? "School logo" : kind === "article" ? "Article image" : "Merchandise image"} uploaded. Save the draft to keep it. The default image is retained.`);
    } catch (cause) { setEditorialImageError({kind,id,message:cause instanceof Error ? cause.message : "Image upload failed."}); }
    finally { pending.current = false; setBusy(null); }
  }
  async function uploadHeadshot(target: HeadshotTarget, file: File | undefined) {
    if (!file || !saved || pending.current) return;
    if (!["image/jpeg","image/png","image/webp"].includes(file.type) || !file.size || file.size > 10 * 1024 * 1024) {
      setError("Choose a PNG, JPG or WebP headshot up to 10 MB."); return;
    }
    pending.current = true; setBusy("upload"); setError("");
    try {
      const response = await fetch(`/api/preview-lockers/${saved.id}/uploads`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind:"headshot",mimeType:file.type,size:file.size})});
      if (!response.ok) throw new Error("Could not prepare this headshot upload. Your selected images are unchanged.");
      const ticket = await response.json() as {path:string;token:string;bucket:string};
      const bucket = createClient().storage.from(ticket.bucket);
      const upload = await bucket.uploadToSignedUrl(ticket.path,ticket.token,file,{contentType:file.type});
      if (upload.error) throw new Error("Headshot upload failed. Your selected images are unchanged.");
      change(current => target === "hero" ? {headshot_storage_path:ticket.path,photos:current.photos.map(photo => ({...photo,isHeadshot:false}))} : {bio_headshot_storage_path:ticket.path});
      // A thumbnail failure must not discard an otherwise completed upload.
      try {
        const preview = await bucket.createSignedUrl(ticket.path,900);
        if (preview.data?.signedUrl) setEditorialImages(current => ({...current,[ticket.path]:preview.data.signedUrl}));
      } catch { /* Saved path can still be reviewed after reloading. */ }
      setMessage(`${target === "hero" ? "Hero" : "Bio"} headshot uploaded privately. Save the draft to apply it.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Headshot upload failed."); }
    finally { pending.current = false; setBusy(null); }
  }
  async function uploadBanner(file: File | undefined) {
    if (!file || !saved || pending.current) return;
    pending.current = true; setBusy("upload"); setError("");
    try {
      const response = await fetch(`/api/preview-lockers/${saved.id}/uploads`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "banner", mimeType: file.type, size: file.size }) });
      if (!response.ok) throw new Error("Banner must be a JPG, PNG, or WebP image under 10 MB.");
      const ticket = await response.json() as { path: string; token: string; bucket: string };
      const uploaded = await createClient().storage.from(ticket.bucket).uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
      if (uploaded.error) throw new Error("Banner upload failed. Try again.");
      change({ photo_room_banner_storage_path: ticket.path, photo_room_banner_url: null });
      setMessage("Banner image uploaded privately. Add the external destination and save this draft.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Banner upload failed."); }
    finally { pending.current = false; setBusy(null); }
  }
  function addYouTubeBatch() {
    const result = parseYouTubeBatch(youtubeBatch, draft.videos);
    const available = Math.max(0, 24 - draft.videos.length);
    if (result.videos.length) change({ videos: [...draft.videos, ...result.videos.slice(0, available)] });
    setYoutubeBatch("");
    setMessage(`Added ${Math.min(result.videos.length, available)} YouTube link(s). ${result.invalid} invalid, ${result.duplicate} duplicate, ${result.overflow} over the 24-video limit. Edit titles and thumbnails below, then save.`);
  }
  return <div className={`${styles.form} space-y-6`}>
    <div className="flex flex-wrap justify-end gap-3"><Button type="button" variant="outline" disabled={!!busy} onClick={()=>void save(true)}>Save draft</Button><Link href="/admin/preview-lockers" className="inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-[#ffbb00]">Close preview</Link></div>
    <AlertDialog open={leaveHref !== null} onOpenChange={open=>{if(!open)setLeaveHref(null);}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Leave this preview?</AlertDialogTitle><AlertDialogDescription>Your unsaved changes will be discarded. The last saved preview, if any, will remain unchanged.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Stay and edit</AlertDialogCancel><AlertDialogAction onClick={()=>{if(leaveHref){allowDraftDiscard.current=true;window.location.assign(leaveHref);}}}>Discard and leave</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>

    <AlertDialog open={removalKind !== null} onOpenChange={open => { if (!open) setRemovalKind(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove selected {removalKind === "photo" ? "photos" : "videos"}?</AlertDialogTitle><AlertDialogDescription>This removes {removalKind === "photo" ? selectedPhotos.length : selectedVideos.length} items from the draft and clears their award or social attachments. Save the draft to apply it. Uploaded files are not deleted from storage.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep items</AlertDialogCancel><AlertDialogAction onClick={() => { if (removalKind) removeMedia(removalKind, removalKind === "photo" ? selectedPhotos : selectedVideos); }}>Remove from draft</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <p className="text-sm">Private demo only. Media suggestions are unverified; saving does not grant rights or create an Athlete Career ID.</p>
    {message && <p role="status" className="rounded-lg border p-3">{message}</p>}
    {error && <div role="alert" className="rounded-lg border border-red-500 p-3"><p>{error}</p>{saveVersionConflict && saved && <a href={`/admin/preview-lockers/${saved.id}/edit`} target="_blank" rel="noopener noreferrer" aria-label="Open latest saved version in a new tab" className="mt-2 inline-flex min-h-11 items-center underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffbb00]">Open latest saved version in a new tab</a>}</div>}
    <BuildAllPanel status={build} running={busy === "build"} canStart={!busy && !statsNeedReload && draft.full_name.trim().length >= 2} canRetry={!busy && !!saved && !dirty && failedRetryable(build).length > 0}
      onStart={() => { void buildAll(); }} onCancel={() => abort.current?.abort()} onRetry={() => { void retryBuild(); }} onReview={setActiveFolder} />
    <div className={styles.folderTabs} role="tablist" aria-label="Locker editing sections">{["info", "career", "stats", "images", "videos", "media"].map((key, index, tabs) => <button key={key} type="button" role="tab" id={`locker-tab-${key}`} aria-controls={`locker-panel-${key}`} aria-selected={activeFolder === key} tabIndex={activeFolder === key ? 0 : -1} className={styles.folderTab} onClick={() => setActiveFolder(key)} onKeyDown={event => {
      const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : null;
      if (next === null) return;
      event.preventDefault(); setActiveFolder(tabs[next]); event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("[role=tab]")[next]?.focus();
    }}><span>{key === "info" ? "Info" : key.charAt(0).toUpperCase() + key.slice(1)}</span></button>)}</div>
    <fieldset disabled={!!busy || statsNeedReload} className="space-y-6 disabled:opacity-70">
      <legend className="sr-only">Locker content and review</legend>
      <section id="locker-panel-info" role="tabpanel" aria-labelledby="locker-tab-info" tabIndex={0} hidden={activeFolder !== "info"} className={styles.folderPanel}>
      <h2 className={styles.folderHeading}>Identity & presentation</h2>
        {!saved && enrollmentEnabled && !reservedId && <section className="space-y-4 rounded-xl border border-neutral-300 p-4 dark:border-slate-700"><h2 className="font-semibold">Conversion tracking</h2><label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={enroll} onChange={e=>{setEnroll(e.target.checked);setDirty(true);setReviewed(false);}}/>Create and enroll in the preview funnel</label>{enroll ? <><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm">GTM contact<select aria-label="Enrollment GTM contact" className="min-h-11 rounded border bg-background p-2" value={enrollment.contact_id} onChange={e=>{setEnrollment({...enrollment,contact_id:e.target.value});setDirty(true);setReviewed(false);}}><option value="">Select the intended athlete</option>{enrollmentContacts.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>{([['campaign','Campaign / batch'],['source','Source code']] as const).map(([key,label])=><label key={key} className="grid gap-2 text-sm">{label}<Input aria-label={label} maxLength={80} value={enrollment[key]} onChange={e=>{setEnrollment({...enrollment,[key]:e.target.value});setDirty(true);setReviewed(false);}}/></label>)}<label className="grid gap-2 text-sm">Outreach channel<select className="min-h-11 rounded border bg-background p-2" value={enrollment.channel} onChange={e=>{setEnrollment({...enrollment,channel:e.target.value});setDirty(true);setReviewed(false);}}>{['email','linkedin','sms','in_person','referral','other'].map(v=><option key={v} value={v}>{v.replaceAll('_',' ')}</option>)}</select></label><label className="grid gap-2 text-sm">Relationship<select className="min-h-11 rounded border bg-background p-2" value={enrollment.relationship} onChange={e=>{setEnrollment({...enrollment,relationship:e.target.value});setDirty(true);setReviewed(false);}}><option value="warm">Warm</option><option value="cold">Cold</option></select></label><label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={enrollment.is_test} onChange={e=>{setEnrollment({...enrollment,is_test:e.target.checked});setDirty(true);setReviewed(false);}}/>Test preview (exclude from metrics)</label></div><p className="text-xs text-neutral-500">One preview per GTM contact. Campaign attribution is saved once. Creating and enrolling does not send an invitation or grant viewer access.</p>{!enrollmentContacts.length && <p className="text-sm">No active GTM contacts. Add the athlete in GTM first, or turn off enrollment to save a preview-only draft.</p>}</> : <p className="text-sm text-neutral-500">Save a private draft now. You can enroll it later from the preview funnel.</p>}</section>}
      <div className="grid gap-4 sm:grid-cols-2">

      <label className="grid gap-2 text-sm">Full name<Input aria-label="Full name" maxLength={120} value={draft.full_name} onChange={event => change({ full_name: event.target.value, ...(!saved ? { slug: slugify(event.target.value) } : {}) })} /></label>
        {field("slug", "Private URL slug", 80)}{field("school", "School")}{field("position", "Position", 60)}
        <label className="grid gap-2 text-sm">Career level<select aria-label="Career level" className="h-10 rounded-md border bg-background px-3" value={draft.level ?? ""} onChange={event => change({ level: (event.target.value || null) as PreviewContent["level"] })}><option value="">Not recorded</option><option value="hs">High school</option><option value="college">College</option><option value="pro">Professional</option><option value="former">Former athlete</option></select></label>
        {field("dob", "Birthdate", 10)}{field("high_school", "High school")}
        {field("hometown", "Hometown")}{field("jersey", "Jersey", 10)}{field("height_in", "Height (inches)", 2, true)}{field("weight_lbs", "Weight (lbs)", 3, true)}{field("games_played", "Games played", 4, true)}
      </div>
      {(!saved || gtmLinked) && <section className="space-y-3 rounded-lg border p-4" aria-labelledby="preview-scraper-heading"><div className="space-y-1"><h2 id="preview-scraper-heading" className="font-semibold">Build with web scraper</h2><p className="text-sm">Searches nflverse NFL roster data, cfbverse college roster data, Wikipedia, ESPN, and YouTube. Suggestions fill only blank fields and remain editable; they are not identity, accuracy, copyright, or rights verification.</p><p className="text-sm">Google Images is not queried. A future image-search provider requires an approved adapter. You can cancel, continue manually, or replace every suggestion before saving.</p><p className="text-sm font-medium">Scraped and manual changes are retained while this editor remains open, until you explicitly review and save. Preview pages open the last saved version in a new tab so the editor stays open. A previously closed unsaved draft cannot be recovered.</p></div><div className="flex flex-wrap gap-3"><Button type="button" variant="outline" onClick={() => { void discover(); }}>Build with web scraper</Button><Button type="button" variant="outline" onClick={() => setMessage("Manual mode: complete the fields below, review, then save privately.")}>Continue manually</Button></div></section>}
      <div className="grid gap-4 md:grid-cols-2">{(["hero", "bio"] as const).map(target => <HeadshotFields key={target} target={target} photos={draft.photos} url={target === "hero" ? draft.headshot_url : draft.bio_headshot_url} storagePath={target === "hero" ? draft.headshot_storage_path : draft.bio_headshot_storage_path} imageUrls={editorialImages} heroImageUrl={draft.headshot_storage_path ? editorialImages[draft.headshot_storage_path] || "" : (() => { const photo = draft.photos.find(item => item.isHeadshot); return photo ? "storagePath" in photo ? editorialImages[photo.storagePath] || "" : photo.url : draft.headshot_url || "/images/black-headshot-fallback.svg"; })()} saved={!!saved} busy={!!busy}
        onSelect={id => change(current => {
          if (target === "hero") return {headshot_storage_path:null,photos:current.photos.map(photo => ({...photo,isHeadshot:photo.id === id,...(photo.id === id ? {inHeroSlideshow:false} : {})}))};
          const photo=current.photos.find(item => item.id === id);
          return {bio_headshot_storage_path:photo && "storagePath" in photo ? photo.storagePath : null,bio_headshot_url:photo && "url" in photo ? photo.url : null};
        })}
        onUrl={url => change(current => target === "hero" ? {headshot_url:url,headshot_storage_path:null,photos:current.photos.map(photo => ({...photo,isHeadshot:false}))} : {bio_headshot_url:url,bio_headshot_storage_path:null})}
        onUpload={file => { void uploadHeadshot(target,file); }}
        onReset={() => change(current => target === "hero" ? {headshot_storage_path:null,photos:current.photos.map(photo => ({...photo,isHeadshot:false}))} : {bio_headshot_url:null,bio_headshot_storage_path:null})}
      />)}</div>
      {field("hero_video_url", "Desktop landscape hero URL (legacy fallback)", 2048)}
      <label className="grid gap-2 text-sm">Bio (short overview)<Textarea aria-label="Biography" aria-describedby="preview-bio-help" rows={4} maxLength={4000} value={draft.bio} onChange={event => change({ bio: event.target.value })} /><span id="preview-bio-help" className="text-xs text-muted-foreground">A few sentences introducing the athlete and their career. Appears in the Locker’s Bio section.</span></label>
      <label className="grid gap-2 text-sm">Life story<Textarea aria-label="Life story" aria-describedby="preview-story-help" rows={12} maxLength={20000} value={draft.story} onChange={event => change({ story: event.target.value })} /><span id="preview-story-help" className="text-xs text-muted-foreground">A longer account of early life, school, career and life beyond sports. Appears only in Story. Paragraph breaks are preserved; scraper refreshes keep your edits.</span><span className="text-xs text-muted-foreground">{draft.story.length.toLocaleString()} / 20,000 characters</span></label>
      <div className="grid gap-4 sm:grid-cols-2">{field("athlete_quote", "Athlete quote", 600)}{field("athlete_quote_author", "Quote attribution")}</div>
      </section>
      <section id="locker-panel-career" role="tabpanel" aria-labelledby="locker-tab-career" tabIndex={0} hidden={activeFolder !== "career"} className={styles.folderPanel}>
      <h2 className={styles.folderHeading}>Career & achievements</h2>
      <PfrJerseyImport name={draft.full_name} teams={draft.pro_teams.map(team => team.label)} initialUrl={draft.pfr_stats[0]?.sourceUrl ?? ""} onImport={items => change(reviewPfrJerseys(draft, items))} />
      {(["schools", "pro_teams"] as const).map(kind => <BuilderSection key={kind} title={kind === "schools" ? "School history" : "Pro team history"} count={draft[kind].length} description="Expand to review and edit career affiliations"><Button type="button" variant="outline" disabled={!!busy} onClick={() => { void discover(true); }}>Find jersey numbers</Button><p className="text-sm">Searches the matched player’s PFR jersey badges and season rosters. Matching numbers are corroborated; conflicts need review. Saved numbers remain editable and are not overwritten.</p>{draft[kind].map((team, index) => <div key={index} className="grid items-end gap-4 rounded-lg border p-4 sm:grid-cols-2"><Input aria-label={`${kind} ${index + 1} label`} value={team.label} maxLength={80} onChange={e => change({ [kind]: draft[kind].map((v, i) => i === index ? { ...v, label: e.target.value } : v) })} />{kind === "schools" && <>
        <label className="grid gap-2 text-sm">Desktop display name (optional)<Input aria-label={`School ${index + 1} desktop display name`} value={draft.schools[index].desktopName ?? ""} maxLength={80} placeholder="Use automatic school name" onChange={e => change({ schools: draft.schools.map((v, i) => i === index ? { ...v, desktopName: e.target.value || null } : v) })} /></label>
        <label className="grid gap-2 text-sm">Mobile display name (optional)<Input aria-label={`School ${index + 1} mobile display name`} value={draft.schools[index].mobileName ?? ""} maxLength={40} placeholder="Use automatic abbreviation" onChange={e => change({ schools: draft.schools.map((v, i) => i === index ? { ...v, mobileName: e.target.value || null } : v) })} /></label>
        <p className="text-sm text-muted-foreground sm:col-span-2">Custom names appear on the Locker’s school badges in the hero and Team History. Leave blank for automatic formatting. These labels do not change the school used for matching.</p>
      </>}<Input aria-label={`${kind} ${index + 1} color`} type="color" value={team.color} onChange={e => change({ [kind]: draft[kind].map((v, i) => i === index ? { ...v, color: e.target.value } : v) })} /><Input aria-label={`${kind} ${index + 1} logo HTTPS URL`} value={team.logo ?? ""} maxLength={2048} onChange={e => change({ [kind]: draft[kind].map((v, i) => i === index ? { ...v, logo: e.target.value || null } : v) })} />{kind === "schools" && <EditorialImageInput label={`School ${index + 1}`} title={team.label || `School ${index + 1}`} kind="school logo" defaultUrl={team.logo} storagePath={draft.schools[index].logoStoragePath} imageUrls={editorialImages} saved={!!saved} busy={!!busy} error={editorialImageError?.kind === "school_logo" && editorialImageError.id === String(index) ? editorialImageError.message : undefined} onUpload={file => { void uploadEditorialImage("school_logo",String(index),file); }} onDefault={() => change(current => ({schools:current.schools.map((value,i) => i === index ? {...value,logoStoragePath:null} : value)}))}/>}<label className="grid gap-2 text-sm">Jersey numbers (comma separated)<Input aria-label={`${kind} ${index + 1} jersey numbers`} value={(team.jerseyNumbers ?? []).join(", ")} maxLength={60} onChange={e => change({ [kind]: draft[kind].map((v, i) => i === index ? { ...v, jerseyStatus: "reviewed", jerseyNumbers: e.target.value ? e.target.value.split(",").map(number => number.trim().replace(/^#\s*/, "")) : [] } : v) })} /></label><label className="grid gap-2 text-sm">Jersey number source<Input aria-label={`${kind} ${index + 1} jersey source HTTPS URL`} value={team.jerseySourceUrl ?? ""} maxLength={2048} onChange={e => change({ [kind]: draft[kind].map((v, i) => i === index ? { ...v, jerseySourceUrl: e.target.value || null } : v) })} /></label><div className="space-y-1 text-sm"><p>{team.jerseyStatus === "conflict" ? "Sources disagree: confirm the correct numbers before they appear on the Locker." : team.jerseyStatus === "corroborated" ? "PFR and roster sources agree." : team.jerseyStatus === "reviewed" ? "Numbers reviewed manually." : team.jerseyNumbers?.length ? "Single-source result: review before saving." : "No team-specific number found yet."}</p>{(team.jerseySources ?? []).map(url => <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block break-all underline">{url}</a>)}{team.jerseyNumbers?.length ? <Button type="button" variant="outline" onClick={() => change({ [kind]: draft[kind].map((v, i) => i === index ? { ...v, jerseyStatus: "reviewed" } : v) })}>Confirm jersey numbers</Button> : null}</div><Button type="button" variant="outline" disabled={!!busy} onClick={() => change({ [kind]: draft[kind].filter((_, i) => i !== index) })}>Remove from draft</Button></div>)}<Button type="button" variant="outline" disabled={!!busy || draft[kind].length >= 32} onClick={() => change({ [kind]: [...draft[kind], { label: "", color: "#152238", logo: null }] })}>Add {kind === "schools" ? "school" : "pro team"}</Button></BuilderSection>)}
      <AwardsSection enrichment={saved ? <EnrichmentPanel report={awardsReport} stale={dirty || !!awardsReport && awardsReport.source_revision !== saved.revision} disabled={dirty || !!busy} busy={busy === "awards"} error={awardsError} onRefresh={() => { void refreshAwards(); }} /> : undefined} awards={draft.awards} photos={draft.photos} onChange={awards => change({ awards })} />

      </section>
      <section id="locker-panel-stats" role="tabpanel" aria-labelledby="locker-tab-stats" tabIndex={0} hidden={activeFolder !== "stats"} className={styles.folderPanel}>
      <h2 className={styles.folderHeading}>Statistics & imports</h2>
      <CombineResultsForm value={draft.combine_results} onChange={combine_results => change({ combine_results })} discovery={{ ref: combineSearch, preview: saved, identityKey: JSON.stringify([draft.full_name, draft.school, draft.schools, draft.pro_teams]), searchDisabled: dirty || !!busy || statsNeedReload, onBusyChange: active => { pending.current = active; setBusy(active ? "combine" : null); } }} />
      <CfbCsvImport athleteName={draft.full_name} value={draft.cfb_stats} onChange={cfb_stats => change({ cfb_stats })} />
      <StatsCsvImport league="nfl" athleteName={draft.full_name} value={draft.pfr_stats} onChange={pfr_stats => change({ pfr_stats })} disabled={busy !== null || statsNeedReload} />
      <section className="space-y-3" aria-label="Stats-only update">
        <Button type="button" variant="outline" disabled={!saved || statsNeedReload} aria-expanded={showStats} aria-controls="preview-sportradar-panel" onClick={() => setShowStats(value => !value)}>Pull Sportradar stats only</Button>
        <p className="text-sm">The Sportradar subscription has expired. Use the NFL CSV import above for the sprint. Previously saved provider statistics remain available; fetching new data requires a working subscription. Reviewed CSV tables take precedence over saved NFL provider data.</p>
        {!saved && <p className="text-sm">Save this preview as a draft first to enable stats import.</p>}
        {statsNeedReload && <p role="status" className="text-sm">Preview identity or statistics updated. <a className="underline" href={`/admin/preview-lockers/${saved!.id}/edit`} data-draft-discard="true">Reload the saved version before editing</a>.</p>}
        {saved && showStats && <div id="preview-sportradar-panel"><SportradarPanel previewId={saved.id} athleteName={draft.full_name} importDisabled={dirty || statsNeedReload} onBusyChange={value => { pending.current = value; setBusy(value ? "stats" : null); }} onImported={() => { setStatsNeedReload(true); setCompleted(false); }} /></div>}
      </section>
      <BuilderSection title="Career statistics — manual fallback" count={draft.career_stats.length} description="Expand to enter sourced career totals when a CSV is unavailable."><p className="text-sm text-muted-foreground">Use reviewed NFL CSV tables for season history. Enter these separate career totals manually when a CSV is unavailable. Blank statistics stay pending. Manual entry does not use API quota.</p><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{previewStatKeys.map(key => { const stat = draft.career_stats.find(item => item.key === key); return <label className="grid gap-2 text-sm" key={key}>{previewStatLabels[key]}<Input aria-label={previewStatLabels[key]} type="number" min="0" max="1000000" step={key === "sacks" ? "0.5" : "1"} value={stat?.value ?? ""} onChange={event => { const value = event.target.value; change({ career_stats: value === "" ? draft.career_stats.filter(item => item.key !== key) : [...draft.career_stats.filter(item => item.key !== key), { key, value: Number(value) }] }); }} /></label>; })}</div></BuilderSection>
      </section>
      <section id="locker-panel-videos" role="tabpanel" aria-labelledby="locker-tab-videos" tabIndex={0} hidden={activeFolder !== "videos"} className={styles.folderPanel}>
      <h2 className={styles.folderHeading}>Film Room & hero videos</h2>
      <MediaSection title="Videos" count={draft.videos.length} limit={24}><label className="grid gap-2 text-sm font-medium">Add multiple YouTube links<Textarea aria-label="YouTube links, one per line" value={youtubeBatch} onChange={event => setYoutubeBatch(event.target.value)} placeholder="Paste one YouTube URL per line" rows={4} /></label><Button type="button" variant="outline" disabled={!youtubeBatch.trim() || draft.videos.length >= 24} onClick={addYouTubeBatch}>Add YouTube links</Button><label className="grid gap-2 text-sm font-medium">Film Room hero video
        <select aria-label="Film Room hero video" className="rounded-md border bg-background p-2" disabled={!draft.videos.length} value={draft.videos[0]?.id ?? ""} onChange={event => {
          const selected = draft.videos.find(video => video.id === event.target.value);
          if (selected) change({ videos: [selected, ...draft.videos.filter(video => video.id !== selected.id)] });
        }}>
          {!draft.videos.length ? <option value="">Add a video to choose a hero</option> : null}
          {draft.videos.map((video, index) => <option key={video.id} value={video.id}>{video.title || `Untitled video ${index + 1}`}</option>)}
        </select>
        <span className="font-normal">Plays muted when the Film Room opens. Save your draft to apply this choice.</span>
      </label>{saved ? <label className="grid gap-2 text-sm font-medium">Upload multiple private videos<Input aria-label="Upload multiple private videos" type="file" multiple accept="video/mp4,video/webm,video/quicktime" onChange={event => { void uploadFiles("video", event.target.files); event.target.value = ""; }} /><span className="font-normal">MP4, WebM, or MOV. Up to 250 MB each. Uploads stay private and must be saved into this draft.</span></label> : <p className="text-sm">Save the private preview once before uploading video files.</p>}{draft.videos.length > 0 && <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm"><button type="button" className="underline" onClick={() => setSelectedVideos(draft.videos.map(video => video.id))}>Select all videos</button><button type="button" className="underline" onClick={() => setSelectedVideos([])}>Clear selection</button><span aria-live="polite">{selectedVideos.length} selected</span><Button type="button" variant="outline" disabled={!selectedVideos.length} onClick={() => setRemovalKind("video")}>Remove selected videos</Button></div>}{draft.videos.map((video, index) => <MediaItem key={video.id} media={video} kind="video" index={index} selected={selectedVideos.includes(video.id)} onSelect={selected => toggleSelection("video", video.id, selected)}><label className="grid gap-2 text-sm">Film Room category<select aria-label={`Video ${index + 1} category`} className="h-10 rounded-md border bg-background px-3" value={previewVideoLevel(video)} onChange={event => change({ videos: draft.videos.map((item, i) => i === index ? { ...item, level: event.target.value as NonNullable<typeof video.level> } : item) })}>{previewVideoCategories.map(category => <option key={category.value} value={category.value}>{category.label}</option>)}</select><span className="text-xs text-muted-foreground">Choose which Film Room row shows this video.</span></label><label className="grid gap-2 text-sm">Also show in Locker media<select aria-label={`Video ${index + 1} Locker placement`} className="h-10 rounded-md border bg-background px-3" value={video.lockerPlacement ?? ""} onChange={event => {
        const placement = event.target.value as NonNullable<typeof video.lockerPlacement> | "";
        change({ videos: draft.videos.map((item, i) => {
          if (i !== index) return item;
          const { lockerPlacement: _previous, ...rest } = item;
          return { ...rest, ...(placement ? { lockerPlacement: placement } : {}) };
        }) });
      }}><option value="">Film Room only</option><option value="podcast">Podcast</option><option value="social">Social</option><option value="both">Podcast + Social</option></select><span className="text-xs text-muted-foreground">Show this video in the selected Media tabs too. It stays in the Film Room. Save your draft to apply.</span></label><label className="grid gap-2 text-sm">Locker hero placement<select className="rounded-md border bg-background p-2" value={video.heroDevice ?? ""} onChange={event => {
        const device = event.target.value as "mobile" | "desktop" | "";
        change({ videos: draft.videos.map((item, i) => {
          const { heroDevice: previous, ...rest } = item;
          return i === index ? { ...rest, ...(device ? { heroDevice: device } : {}) } : previous === device ? rest : item;
        }) });
      }}><option value="">No Locker hero placement</option><option value="mobile">Mobile hero · portrait (9:16)</option><option value="desktop">Desktop / tablet hero · landscape (16:9)</option></select><span>Use a direct MP4/WebM file or a private upload. Select the matching orientation; devices without a selection show photos.</span></label><Input aria-label={`Video ${index + 1} title`} placeholder="Title" maxLength={160} value={video.title} onChange={e => change({ videos: draft.videos.map((v, i) => i === index ? { ...v, title: e.target.value } : v) })} />{"url" in video ? <><Input aria-label={`Video ${index + 1} url`} placeholder="url HTTPS URL" maxLength={2048} value={video.url} onChange={e => change({ videos: draft.videos.map((v, i) => i === index ? { ...v, url: e.target.value } : v) })} /><Input aria-label={`Video ${index + 1} thumb`} placeholder="thumb HTTPS URL" maxLength={2048} value={video.thumb ?? ""} onChange={e => change({ videos: draft.videos.map((v, i) => i === index && "url" in v ? { ...v, thumb: e.target.value || null } : v) })} /></> : <p className="text-sm">Private uploaded file · {video.mimeType}</p>}<Button type="button" variant="outline" onClick={() => removeMedia("video", [video.id])}>Remove video from draft</Button></MediaItem>)}<Button type="button" variant="outline" disabled={draft.videos.length >= 24} onClick={() => change({ videos: [...draft.videos, { id: crypto.randomUUID(), title: "", url: "", thumb: null }] })}>Add video</Button></MediaSection>
      </section>
      <section id="locker-panel-images" role="tabpanel" aria-labelledby="locker-tab-images" tabIndex={0} hidden={activeFolder !== "images"} className={styles.folderPanel}>
      <h2 className={styles.folderHeading}>Photos & Photo Room</h2>
      <MediaSection title="Photos" count={draft.photos.length} limit={40}>{saved ? <label className="grid gap-2 text-sm font-medium">Upload multiple private photos<Input aria-label="Upload multiple private photos" type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={event => { void uploadFiles("photo", event.target.files); event.target.value = ""; }} /><span className="font-normal">JPG, PNG, or WebP. Up to 10 MB each. Uploads stay private and must be saved into this draft.</span></label> : <p className="text-sm">Save the private preview once before uploading photo files.</p>}{draft.photos.length > 0 && <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm"><button type="button" className="underline" onClick={() => setSelectedPhotos(draft.photos.map(photo => photo.id))}>Select all photos</button><button type="button" className="underline" onClick={() => setSelectedPhotos([])}>Clear selection</button><span aria-live="polite">{selectedPhotos.length} selected</span><Button type="button" variant="outline" disabled={!selectedPhotos.length} onClick={() => setRemovalKind("photo")}>Remove selected photos</Button></div>}{draft.photos.map((photo, index) => <MediaItem key={photo.id} media={photo} kind="photo" index={index} selected={selectedPhotos.includes(photo.id)} onSelect={selected => toggleSelection("photo", photo.id, selected)}><label className="flex items-center gap-2 text-sm"><input type="checkbox" aria-label={`Photo ${index + 1} appears in hero slideshow`} checked={photo.inHeroSlideshow !== false && !photo.isHeadshot} disabled={photo.isHeadshot} onChange={event => change({ photos: draft.photos.map((item, i) => i === index ? { ...item, inHeroSlideshow: event.target.checked } : item) })} />Show in hero slideshow</label><p className="text-xs text-muted-foreground">{photo.isHeadshot ? "Selected headshot. Headshots stay out of the slideshow." : "Selected photos rotate in list order when no hero video is assigned for the device. Uncheck every photo for no slideshow."}</p><Input aria-label={`Photo ${index + 1} title`} placeholder="title" maxLength={160} value={photo.title} onChange={e => change({ photos: draft.photos.map((v, i) => i === index ? { ...v, title: e.target.value } : v) })} />{"url" in photo ? <Input aria-label={`Photo ${index + 1} url`} placeholder="url" maxLength={2048} value={photo.url} onChange={e => change({ photos: draft.photos.map((v, i) => i === index ? { ...v, url: e.target.value } : v) })} /> : <p className="text-sm">Private uploaded file · {photo.mimeType}</p>}{(["credits", "sourceUrl", "season"] as const).map(key => <Input key={key} aria-label={`Photo ${index + 1} ${key}`} placeholder={key} maxLength={key === "credits" ? 300 : key === "season" ? 20 : 2048} value={photo[key] ?? ""} onChange={e => change({ photos: draft.photos.map((v, i) => i === index ? { ...v, [key]: e.target.value || null } : v) })} />)}<select aria-label={`Photo ${index + 1} level`} className="h-10 rounded-md border bg-background px-3" value={photo.level} onChange={e => change({ photos: draft.photos.map((v, i) => i === index ? { ...v, level: e.target.value as typeof photo.level } : v) })}>{["hs", "cfb", "pro", "off-field"].map(level => <option key={level}>{level}</option>)}</select><Button type="button" variant="outline" onClick={() => removeMedia("photo", [photo.id])}>Remove photo from draft</Button></MediaItem>)}<Button type="button" variant="outline" disabled={draft.photos.length >= 40} onClick={() => change({ photos: [...draft.photos, { id: crypto.randomUUID(), title: "", url: "", credits: null, sourceUrl: null, season: null, level: "off-field" }] })}>Add photo</Button></MediaSection>
      <section aria-labelledby="photo-room-banner-heading" className="space-y-4 rounded-xl border bg-card p-4 sm:p-5">
        <div>
          <h2 id="photo-room-banner-heading" className="text-lg font-semibold">Photo Room ad banner</h2>
          <p className="text-sm text-muted-foreground">Add an image and destination link for the banner below the Photo Room hero.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm">Banner image HTTPS URL<Input aria-label="Banner image HTTPS URL" maxLength={2048} value={draft.photo_room_banner_url ?? ""} onChange={event => change({ photo_room_banner_url: event.target.value || null, ...(event.target.value ? { photo_room_banner_storage_path: null } : {}) })} /></label>{field("photo_room_banner_link", "Banner destination HTTPS URL", 2048)}</div>
        {saved ? <label className="grid gap-2 text-sm">Or upload a local banner image<Input aria-label="Upload local banner image" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { void uploadBanner(event.target.files?.[0]); event.target.value = ""; }} /></label> : <p className="text-sm">Save this preview once before uploading a banner image.</p>}
        {draft.photo_room_banner_storage_path && <div className="flex items-center gap-3 text-sm"><span>Private banner image selected</span><Button type="button" variant="outline" onClick={() => change({ photo_room_banner_storage_path: null })}>Remove uploaded banner</Button></div>}
        <p className="text-xs text-muted-foreground">An image URL or local upload plus an external HTTPS destination shows the banner. It is at most 70% of the viewport width. No image leaves no banner space.</p>
      </section>
      </section>
      <section id="locker-panel-media" role="tabpanel" aria-labelledby="locker-tab-media" tabIndex={0} hidden={activeFolder !== "media"} className={styles.folderPanel}>
      <h2 className={styles.folderHeading}>Media & merchandise</h2>
      <ArticlesSection imageUrls={editorialImages} imageError={editorialImageError?.kind === "article" ? editorialImageError : null} onUploadImage={(item,file) => { void uploadEditorialImage("article",item.sourceUrl??item.id,file,item); }} articles={newsArticles} edits={draft.article_edits} onChange={article_edits => change({ article_edits })} saved={!!saved} dirty={dirty} canLoad={!!saved && !dirty && !busy} onReload={() => { void loadNews(); }} onRefresh={() => { void loadNews(true); }} review={newsReview?.review ?? null} reviewKey={newsReview?.key ?? ""} identityCurrent={!!saved && !!newsReview?.identity && newsReview.identity === newsAthleteIdentity(draft)} searchContextChanged={!!newsReview && newsReview.searchContext !== merchandiseIdentity(draft)} playerName={draft.full_name} onDismiss={url => { void dismissNews(url); }} onDismissSelected={dismissNews} onRestore={url => { void dismissNews(url, true); }} onRestoreSelected={urls => dismissNews(urls, true)} onDismissedPage={offset => { void loadNews(false, offset); }} busy={!!busy} reviewError={newsError} />
      <MerchandiseSection saved={!!saved} imageUrls={editorialImages} imageError={editorialImageError?.kind === "merchandise" ? editorialImageError : null} onUploadImage={(id,file) => { void uploadEditorialImage("merchandise",id,file); }} items={draft.merchandise} onChange={merchandise => change({ merchandise })} onSearch={() => { void searchMerchandise(); }} canSearch={!!saved && !dirty && !busy} searching={busy === "merchandise" && !dismissingMerchandise} savingReview={dismissingMerchandise} searchedAt={merchandiseSearch?.review?.searched_at} result={merchandiseSearch?.result ?? null} resultKey={merchandiseSearch?.key ?? ""} searchError={merchandiseError} playerName={draft.full_name} identityCurrent={merchandiseSearch?.identity === merchandiseIdentity(draft)} onDismiss={url => { void dismissMerchandise(url); }} onDismissSelected={dismissMerchandise} onRestore={url => { void dismissMerchandise(url, true); }} onRestoreSelected={urls => dismissMerchandise(urls, true)} dismissedItems={merchandiseSearch?.review ? dismissedMerchandiseItems(merchandiseSearch.review) : []} busy={!!busy} />
      <SocialSection items={draft.social} photos={draft.photos} videos={draft.videos} saved={!!saved} onChange={social => change({ social })} onUpload={(kind, files, social) => { void uploadFiles(kind, files, { social }); }} />
      </section>
      <label className="flex items-start gap-3"><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} className="mt-1 h-5 w-5" />I reviewed this draft for private demo use. This is not public publication or rights verification.</label>
      <div className="flex flex-wrap gap-3"><Button type="button" variant="outline" onClick={()=>void save(true)}>Save draft</Button><Button type="button" disabled={!reviewed} onClick={()=>void save()}>{saved ? "Save changes privately" : (!saved && enroll ? "Create and enroll preview" : "Save private preview")}</Button></div><p className="text-sm text-muted-foreground">Save draft keeps your progress without enrollment or completion review. Enter a name and valid URL slug; other sections can wait. Existing assigned viewers can still see saved changes.</p>
      {saved && gtmLinked && <section className="space-y-3 rounded-lg border p-4" aria-labelledby="preview-completion-heading">
        <div>
          <h2 id="preview-completion-heading" className="font-semibold">Cohort preview status</h2>
          <p className="mt-1 text-sm font-medium">{completed ? "✓ Preview complete" : "Draft / incomplete"}</p>
          <p className="mt-1 text-sm">Completion confirms explicit review of this persisted private demo only. It does not verify athlete identity, media accuracy, copyright, or rights.</p>
        </div>
        {!completed && <>
          <label className="flex items-start gap-3"><input type="checkbox" checked={completionReviewed} disabled={dirty} onChange={event => setCompletionReviewed(event.target.checked)} className="mt-1 h-5 w-5" />I explicitly reviewed the current persisted preview for private demo use.</label>
          {dirty && <p className="text-sm">Save or discard the unsaved edits before completing this preview.</p>}
          <Button type="button" disabled={!completionReviewed || dirty} onClick={completePreview}>Mark preview complete</Button>
        </>}
      </section>}
    </fieldset>
    {busy === "discovery" && <Button type="button" variant="outline" onClick={() => { abort.current?.abort(); setMessage("Discovery cancelled. Continue manually."); }}>Cancel discovery</Button>}
    {busy === "upload" && <p role="status">Uploading directly to private storage…</p>}
    {busy === "save" && <p role="status">Saving privately…</p>}
    {busy === "news" && <p role="status">Loading saved player news…</p>}
    {busy === "complete" && <p role="status">Saving completion…</p>}
    {saved && <p className="rounded-lg border border-[#ffbb00]/40 p-3 text-sm">Ready to invite? <Link className="font-semibold text-[#ffbb00] underline" href={`/admin/preview-lockers/${saved.id}/link`}>Publish or manage the share link</Link>. Published links open without sign-in.</p>}
    {saved && <PreviewViewerAccess previewId={saved.id} initialAssigned={record ? viewerAssigned : false} />}
    {dirty && <p role="status" className="rounded-lg border p-3 text-sm">Unsaved scraped or manual changes remain here while this editor stays open. Same-tab links and page reload are guarded. Save this draft or use the explicit discard action before leaving.</p>}
    <nav className="flex flex-wrap gap-4" aria-label="Preview navigation"><Link className="underline" href="/admin/preview-lockers">Back to saved previews</Link>{saved ? <><Link className="underline" href={`/preview-lockers/${saved.slug}`} target="_blank" rel="noopener noreferrer">Open last saved private Locker in new tab</Link><Link className="underline" href={`/preview-lockers/${saved.slug}/photos`} target="_blank" rel="noopener noreferrer">Open last saved private Photos in new tab</Link><Link className="underline" href={`/preview-lockers/${saved.slug}/videos`} target="_blank" rel="noopener noreferrer">Open last saved private Film Room in new tab</Link><a className="underline aria-disabled:cursor-not-allowed aria-disabled:opacity-50" aria-disabled={!!busy} href={`/admin/preview-lockers/${saved.id}/edit`} data-draft-discard="true" onClick={event => { if (busy) event.preventDefault(); else { allowDraftDiscard.current = true; window.setTimeout(() => { allowDraftDiscard.current = false; }, 0); } }}>Reload saved version (discards unsaved draft)</a></> : <a className="underline aria-disabled:cursor-not-allowed aria-disabled:opacity-50" aria-disabled={!!busy} href="/admin/preview-lockers" data-draft-discard="true" onClick={event => { if (busy) event.preventDefault(); else { allowDraftDiscard.current = true; window.setTimeout(() => { allowDraftDiscard.current = false; }, 0); } }}>Discard unsaved draft and return to saved previews</a>}</nav>
  </div>;
}
