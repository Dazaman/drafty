"use client";

import { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import type { StandingsEntry } from "@/lib/types";

interface StandingsTimelineProps {
  data: StandingsEntry[];
}

const TEAM_COLORS = [
  "#6EE7B7", "#7DD3FC", "#F9A8D4", "#FCD34D",
  "#A78BFA", "#FB923C", "#34D399", "#60A5FA",
  "#F472B6", "#FBBF24",
];

export default function StandingsTimeline({ data }: StandingsTimelineProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    name: string;
    gw: number;
    position: number;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const containerWidth = containerRef.current.clientWidth;
    const margin = { top: 12, right: 80, bottom: 28, left: 32 };
    const width = containerWidth - margin.left - margin.right;
    const height = 180;

    svg.attr("width", containerWidth).attr("height", height + margin.top + margin.bottom);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const teams = [...new Set(data.map((d) => d.name))];
    const maxGw = d3.max(data, (d) => d.gw) ?? 1;
    const maxPos = d3.max(data, (d) => d.position) ?? teams.length;

    const x = d3.scaleLinear().domain([1, maxGw]).range([0, width]);
    const y = d3.scaleLinear().domain([1, maxPos]).range([0, height]);

    // X axis
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(Math.min(maxGw, 10)).tickFormat((d) => `${d}`))
      .call((g) => g.select(".domain").attr("stroke", "#8B9CB6").attr("stroke-opacity", 0.2))
      .call((g) => g.selectAll(".tick line").attr("stroke", "#8B9CB6").attr("stroke-opacity", 0.1))
      .call((g) => g.selectAll(".tick text").attr("fill", "#8B9CB6").attr("font-size", "9px"));

    // Y axis
    g.append("g")
      .call(d3.axisLeft(y).ticks(maxPos).tickFormat((d) => `${d}`))
      .call((g) => g.select(".domain").attr("stroke", "#8B9CB6").attr("stroke-opacity", 0.2))
      .call((g) => g.selectAll(".tick line").attr("stroke", "#8B9CB6").attr("stroke-opacity", 0.1))
      .call((g) => g.selectAll(".tick text").attr("fill", "#8B9CB6").attr("font-size", "9px"));

    const colorScale = d3.scaleOrdinal<string>().domain(teams).range(TEAM_COLORS);

    const line = d3.line<StandingsEntry>()
      .x((d) => x(d.gw))
      .y((d) => y(d.position))
      .curve(d3.curveMonotoneX);

    const grouped = d3.group(data, (d) => d.name);

    grouped.forEach((entries, name) => {
      const sorted = [...entries].sort((a, b) => a.gw - b.gw);
      g.append("path")
        .datum(sorted)
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", colorScale(name))
        .attr("stroke-width", 2)
        .attr("stroke-opacity", 0.7);

      // Name label at end of line
      const last = sorted[sorted.length - 1];
      g.append("text")
        .attr("x", x(last.gw) + 6)
        .attr("y", y(last.position))
        .attr("dy", "0.35em")
        .attr("fill", colorScale(name))
        .attr("font-size", "9px")
        .attr("font-weight", 500)
        .text(name);
    });

    // Invisible hover targets
    const allPoints = data.map((d) => ({
      ...d,
      cx: x(d.gw) + margin.left,
      cy: y(d.position) + margin.top,
    }));

    svg.on("mousemove", (event) => {
      const [mx, my] = d3.pointer(event);
      let closest = allPoints[0];
      let minDist = Infinity;
      allPoints.forEach((p) => {
        const dist = Math.hypot(p.cx - mx, p.cy - my);
        if (dist < minDist) {
          minDist = dist;
          closest = p;
        }
      });
      if (minDist < 30) {
        setTooltip({
          name: closest.name,
          gw: closest.gw,
          position: closest.position,
          x: closest.cx,
          y: closest.cy,
        });
      } else {
        setTooltip(null);
      }
    });

    svg.on("mouseleave", () => setTooltip(null));
  }, [data]);


  return (
    <div className="bg-ocean-surface rounded-lg p-3.5 border border-mint/10">
      <h2 className="text-mint text-[10px] font-semibold uppercase tracking-[2px] mb-2.5">
        Standings Timeline
      </h2>
      <div ref={containerRef} className="relative">
        <svg ref={svgRef} />
        {tooltip && (
          <div
            className="absolute pointer-events-none bg-ocean border border-mint/20 rounded px-2 py-1 text-xs z-10"
            style={{ left: tooltip.x + 10, top: tooltip.y - 30 }}
          >
            <div className="text-bright font-semibold">{tooltip.name}</div>
            <div className="text-muted">GW {tooltip.gw} · Position {tooltip.position}</div>
          </div>
        )}
      </div>
    </div>
  );
}
