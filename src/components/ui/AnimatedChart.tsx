"use client";

import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { Chart } from "react-chartjs-2";
import type { Chart as ChartInstance, ChartData, ChartOptions, Plugin } from "chart.js";

type Kind = "line" | "bar" | "doughnut";
type Props = { type: Kind; data: ChartData<Kind>; options: ChartOptions<Kind>; reducedMotion: boolean; label: string; revision: unknown };

function AnimatedChart({ type, data, options, reducedMotion, label }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ChartInstance<Kind> | null>(null);
  const timing = useRef({ enter: 1600, update: 420 });
  const initialized = useRef(false);
  const progress = useRef(0);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (root.current) {
      const tokens = getComputedStyle(root.current);
      timing.current = {
        enter: parseFloat(tokens.getPropertyValue("--motion-chart-enter")) || 1600,
        update: parseFloat(tokens.getPropertyValue("--motion-chart-update")) || 420,
      };
    }
    if (!root.current || !window.IntersectionObserver) { setVisible(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { threshold: 0.1 });
    observer.observe(root.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (visible && (reducedMotion || !data.labels?.length)) {
      initialized.current = true; progress.current = 1;
      chartRef.current?.stop();
      chartRef.current?.update("none");
    }
  }, [visible, reducedMotion, data.labels?.length]);

  // Keep each canvas mounted on refresh. Initial entrance and data updates use the shared motion tokens.
  const animatedOptions = useMemo<ChartOptions<Kind>>(() => ({
    ...options,
    animation: reducedMotion ? false : {
      duration: () => initialized.current ? timing.current.update : timing.current.enter,
      easing: "easeOutQuart",
      ...(type === "doughnut" ? { animateRotate: true, animateScale: true } : {}),
      onProgress: event => { if (!initialized.current) progress.current = event.currentStep / Math.max(1, event.numSteps); },
      onComplete: event => { initialized.current = true; progress.current = 1; event.chart.draw(); },
    },
    transitions: { ...options.transitions, active: { animation: { duration: reducedMotion ? 0 : 160 } }, resize: { animation: { duration: 0 } } },
    plugins: { ...options.plugins, tooltip: { ...options.plugins?.tooltip, animation: { duration: reducedMotion ? 0 : 120 } } },
  }), [options, reducedMotion, type]);

  const plugins = useMemo<Plugin<Kind>[]>(() => type !== "line" ? [] : [{
    id: "initial-line-reveal",
    beforeDatasetsDraw(chart) {
      const { ctx, chartArea } = chart;
      ctx.save();
      if (!reducedMotion && !initialized.current) {
        ctx.beginPath();
        ctx.rect(chartArea.left - 8, chartArea.top - 8, (chartArea.width + 16) * progress.current, chartArea.height + 16);
        ctx.clip();
      }
    },
    afterDatasetsDraw(chart) { chart.ctx.restore(); },
  }], [type, reducedMotion]);

  return <div ref={root} className="chart-viewport">
    {visible && <Chart ref={chartRef} type={type} data={data} options={animatedOptions} plugins={plugins} aria-label={label} role="img" />}
  </div>;
}

// A parent input/loading update must not restart a chart animation. Data and callbacks travel together.
export default memo(AnimatedChart, (previous, next) => previous.revision === next.revision && previous.type === next.type && previous.label === next.label
  && previous.reducedMotion === next.reducedMotion && JSON.stringify(previous.data) === JSON.stringify(next.data)
  && JSON.stringify(previous.options) === JSON.stringify(next.options));
