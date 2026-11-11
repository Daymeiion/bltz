"use client";

import { useId, type ReactNode } from "react";
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PhotoOrder({ ids, onMove, children }: {
  ids: string[];
  onMove: (id: string, targetId: string) => void;
  children: ReactNode;
}) {
  const id = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const position = (photoId: string | number) => ids.indexOf(String(photoId)) + 1;

  return (
    <DndContext
      id={id}
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={({ active, over }) => {
        if (over && active.id !== over.id) onMove(String(active.id), String(over.id));
      }}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) => `Picked up photo ${position(active.id)} of ${ids.length}.`,
          onDragOver: ({ over }) => over ? `Position ${position(over.id)} of ${ids.length}.` : undefined,
          onDragEnd: ({ over }) => over ? `Photo dropped at position ${position(over.id)} of ${ids.length}.` : "Photo order unchanged.",
          onDragCancel: () => "Photo reorder canceled.",
        },
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="space-y-5">{children}</div>
      </SortableContext>
    </DndContext>
  );
}

export function SortablePhotoRow({ id, label, disabled, children }: {
  id: string;
  label: string;
  disabled: boolean;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });

  return (
    <div
      ref={setNodeRef}
      className="relative flex min-w-0 items-start gap-2 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
      data-dragging={isDragging}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="mt-5 shrink-0 touch-none cursor-grab active:cursor-grabbing"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${label}`}
        disabled={disabled}
      >
        <GripVertical aria-hidden="true" />
      </Button>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
