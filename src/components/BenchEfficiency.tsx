"use client";

import Link from "next/link";
import { useRef, useEffect, useMemo } from "react";
import * as d3 from "d3";
import type { BenchEntry } from "@/lib/types";

interface BenchEfficiencyProps {
  data: BenchEntry[];
}

export default function BenchEfficiency({ data }: BenchEfficiencyProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const sorted = useMemo(
    () => [...data].sort((a, b) => b.benchPts - a.benchPts),
    [data]
  );

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || sorted.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const containerWidth = containerRef.current.clientWidth;
    const margin = { top: 8, right: 8, bottom: 24, left: 8 };
    const width = containerWidth - margin.left - margin.right;
    const height = 120;

    svg.attr("width", containerWidth).attr("height", height + margin.top + margin.bottom);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    const maxVal = d3.max(sorted, (d) => Math.abs(d.benchPts)) ?? 1;

    const x = d3.scaleBand()
      .domain(sorted.map((d) => d.name))
      .range([0, width])
      .padding(0.3);

    const y = d3.scaleLinear().domain([0, maxVal]).range([0, height]);

    const colors = ["#6EE7B7", "#7DD3FC"];

    g.selectAll("rect")
      .data(sorted)
      .enter()
      .append("rect")
      .attr("x", (d) => x(d.name)!)
      .attr("y", (d) => height - y(Math.abs(d.benchPts)))
      .attr("width", x.bandwidth())
      .attr("height", (d) => y(Math.abs(d.benchPts)))
      .attr("rx", 3)
      .attr("fill", (_, i) => colors[i % 2])
      .attr("fill-opacity", 0.5);

    // Value labels
    g.selectAll(".val")
      .data(sorted)
      .enter()
      .append("text")
      .attr("x", (d) => x(d.name)! + x.bandwidth() / 2)
      .attr("y", (d) => height - y(Math.abs(d.benchPts)) - 4)
      .attr("text-anchor", "middle")
      .attr("fill", "#8B9CB6")
      .attr("font-size", "9px")
      .text((d) => Math.round(Math.abs(d.benchPts)));

    // Name labels
    g.selectAll(".name")
      .data(sorted)
      .enter()
      .append("text")
      .attr("x", (d) => x(d.name)! + x.bandwidth() / 2)
      .attr("y", height + 14)
      .attr("text-anchor", "middle")
      .attr("fill", "#8B9CB6")
      .attr("font-size", "9px")
      .text((d) => d.name);
  }, [sorted]);

  return (
    <div className="bg-ocean-surface rounded-lg p-3.5 border border-mint/10">
      <div className="flex justify-between items-center mb-1">
        <h2 className="text-mint text-[10px] font-semibold uppercase tracking-[2px]">
          Bench Points Left Behind
        </h2>
        <Link href="/bench" className="text-[10px] text-mint/60 hover:text-mint transition-colors">
          View all →
        </Link>
      </div>
      <p className="text-muted text-[10px] mb-2.5">
        Points lost by benching higher-scoring players
      </p>
      <div ref={containerRef}>
        <svg ref={svgRef} />
      </div>
    </div>
  );
}
