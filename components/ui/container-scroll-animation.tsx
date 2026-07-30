"use client";

import {
  motion,
  type MotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

import { cn } from "@/lib/utils";

type ContainerScrollProps = {
  titleComponent?: ReactNode;
  footerComponent?: ReactNode;
  children: ReactNode;
  className?: string;
  cardClassName?: string;
};

export function ContainerScroll({
  titleComponent,
  footerComponent,
  children,
  className,
  cardClassName,
}: ContainerScrollProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ["start end", "center center"],
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 760px)");
    const updateViewport = () => setIsMobile(mediaQuery.matches);

    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);
    return () => mediaQuery.removeEventListener("change", updateViewport);
  }, []);

  const rotateProgress = useTransform(
    scrollYProgress,
    [0, 1],
    shouldReduceMotion ? [0, 0] : [isMobile ? 14 : 20, 0],
  );
  const scaleProgress = useTransform(
    scrollYProgress,
    [0, 1],
    shouldReduceMotion ? [1, 1] : isMobile ? [0.76, 0.96] : [1.04, 1],
  );
  const rotate = useSpring(rotateProgress, {
    stiffness: 92,
    damping: 24,
    mass: 0.32,
  });
  const scale = useSpring(scaleProgress, {
    stiffness: 92,
    damping: 24,
    mass: 0.32,
  });

  return (
    <div
      className={cn(
        "relative flex h-[58rem] items-center justify-center p-4 md:h-[76rem] md:p-20",
        className,
      )}
    >
      <div
        className="relative w-full py-16 md:py-36"
        style={{ perspective: "1000px" }}
      >
        {titleComponent ? <Header titleComponent={titleComponent} /> : null}
        <Card
          cardClassName={cardClassName}
          cardRef={cardRef}
          rotate={rotate}
          scale={scale}
        >
          {children}
        </Card>
        {footerComponent ? (
          <Footer footerComponent={footerComponent} />
        ) : null}
      </div>
    </div>
  );
}

function Header({
  titleComponent,
}: {
  titleComponent: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl text-center">
      {titleComponent}
    </div>
  );
}

function Footer({
  footerComponent,
}: {
  footerComponent: ReactNode;
}) {
  return (
    <div className="relative z-10 mx-auto mt-16 max-w-5xl text-center md:mt-24">
      {footerComponent}
    </div>
  );
}

function Card({
  rotate,
  scale,
  cardRef,
  children,
  cardClassName,
}: {
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  cardRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
  cardClassName?: string;
}) {
  return (
    <motion.div
      ref={cardRef}
      className={cn(
        "mx-auto -mt-6 h-[32rem] w-full max-w-5xl rounded-[26px] border border-white/20 bg-[#080a10] p-2 shadow-[0_32px_90px_rgba(0,0,0,0.62)] md:-mt-12 md:h-[40rem] md:rounded-[30px] md:p-4",
        cardClassName,
      )}
      style={{
        rotateX: rotate,
        scale,
        transformStyle: "preserve-3d",
      }}
    >
      {children}
    </motion.div>
  );
}
