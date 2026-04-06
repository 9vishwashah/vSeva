import React, { useEffect, useRef, useState, startTransition } from "react";

export default function CircularProgressBar(props: any) {
  const {
    number = 75,
    percent = 80,
    strokeWidth = 10,
    barColor = "#0066FF",
    trackColor = "#F3F4F5",
    numberColor = "#131517",
    font,
    animate = true,
    duration = 1.2,
    style,
    label,
    labelColor = "#7B818E",
    labelFont
  } = props;

  const size = 100;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  const [progress, setProgress] = useState(animate ? 0 : percent);
  const requestRef = useRef<number>();
  const startTime = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);

  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "-20%" }
    );
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  const rotation = (props.startAngle || 0) - 90;
  const directionSign = props.direction === "counterclockwise" ? -1 : 1;
  const dashOffset = directionSign * circumference * (1 - progress / 100);

  useEffect(() => {
    if (!animate) {
      startTransition(() => setProgress(percent));
      return;
    }
    if (!inView) return;

    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    startTime.current = undefined;

    function animateStep(ts: number) {
      if (!startTime.current) startTime.current = ts;
      const elapsed = (ts - startTime.current) / 1000;
      const t = Math.min(elapsed / duration, 1);
      
      // Easing function (Optional: can add ease-out here, but linear matches original)
      const val = percent * t;
      startTransition(() => setProgress(val));

      if (t < 1) {
        requestRef.current = requestAnimationFrame(animateStep);
      } else {
        startTransition(() => setProgress(percent));
      }
    }

    requestRef.current = requestAnimationFrame(animateStep);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [percent, animate, duration, inView]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        ...style,
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          transform: `rotate(${rotation}deg)`,
        }}
        preserveAspectRatio="xMidYMid meet"
      >
        <circle
          cx={50}
          cy={50}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={50}
          cy={50}
          r={radius}
          stroke={barColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: animate ? undefined : "stroke-dashoffset 0.4s" }}
        />
      </svg>
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            color: numberColor,
            display: "inline-block",
            width: "100%",
            textAlign: "center",
            ...font,
          }}
        >
          {number}
        </span>
        {label && (
          <span
            style={{
              color: labelColor,
              marginTop: 4,
              width: "100%",
              textAlign: "center",
              ...labelFont,
            }}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
