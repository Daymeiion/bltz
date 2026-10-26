"use client";

import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import styles from "./meeting.module.css";

export default function MeetingViews({ overview, oneSheet, workflow, commercial }: {
  overview: ReactNode; oneSheet: ReactNode; workflow: ReactNode; commercial: ReactNode;
}) {
  return (
    <Tabs defaultValue="overview" className={styles.meeting}>
      <div className={styles.navigation}>
        <span className={styles.navigationLabel}>Getty meeting</span>
        <TabsList aria-label="Getty meeting views" className={styles.tabs}>
          <TabsTrigger value="overview" className={styles.tab}>Original overview</TabsTrigger>
          <TabsTrigger value="one-sheet" className={styles.tab}>Visual one-sheet</TabsTrigger>
          <TabsTrigger value="workflow" className={styles.tab}>Image workflow</TabsTrigger>
          <TabsTrigger value="commercial" className={styles.tab}>Commercial model</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="overview" className={styles.panel}>{overview}</TabsContent>
      <TabsContent value="one-sheet" className={styles.panel}>{oneSheet}</TabsContent>
      <TabsContent value="workflow" className={styles.panel}>{workflow}</TabsContent>
      <TabsContent value="commercial" className={styles.panel}>{commercial}</TabsContent>
    </Tabs>
  );
}
