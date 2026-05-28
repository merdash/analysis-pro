import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface SentimentGaugeProps {
  sentiment: number; // 0 to 100
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  language: 'ar' | 'en';
}

export default function SentimentGauge({ sentiment, signal, language }: SentimentGaugeProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Clear previous elements
    const svgElement = d3.select(svgRef.current);
    svgElement.selectAll('*').remove();

    const width = 240;
    const height = 155;
    const margin = { top: 15, right: 15, bottom: 20, left: 15 };
    
    // Core dimensions of the gauge
    const radius = Math.min(width - margin.left - margin.right, (height - margin.top - margin.bottom) * 2) / 2;
    const innerRadius = radius - 18;
    const outerRadius = radius;

    const g = svgElement
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height - margin.bottom - 5})`);

    // Define Gradients for the zones or indicators
    const defs = svgElement.append('defs');

    // Bearish gradient (Red)
    const redGrad = defs.append('linearGradient')
      .attr('id', 'gauge-bearish-grad')
      .attr('x1', '0%')
      .attr('y1', '100%')
      .attr('x2', '100%')
      .attr('y2', '0%');
    redGrad.append('stop').attr('offset', '0%').attr('stop-color', '#f43f5e').attr('stop-opacity', 0.85);
    redGrad.append('stop').attr('offset', '100%').attr('stop-color', '#ef4444').attr('stop-opacity', 1);

    // Neutral gradient (Yellow/Orange)
    const goldGrad = defs.append('linearGradient')
      .attr('id', 'gauge-neutral-grad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');
    goldGrad.append('stop').attr('offset', '0%').attr('stop-color', '#f59e0b').attr('stop-opacity', 0.85);
    goldGrad.append('stop').attr('offset', '100%').attr('stop-color', '#eab308').attr('stop-opacity', 1);

    // Bullish gradient (Green)
    const greenGrad = defs.append('linearGradient')
      .attr('id', 'gauge-bullish-grad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '100%');
    greenGrad.append('stop').attr('offset', '0%').attr('stop-color', '#10b981').attr('stop-opacity', 0.85);
    greenGrad.append('stop').attr('offset', '100%').attr('stop-color', '#059669').attr('stop-opacity', 1);

    // Arc creator
    const arc = d3.arc<any, d3.DefaultArcObject>()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius)
      .cornerRadius(4);

    // Overall gauge background bar arc
    const backgroundArc: d3.DefaultArcObject = {
      startAngle: -Math.PI / 2,
      endAngle: Math.PI / 2,
      innerRadius: innerRadius,
      outerRadius: outerRadius
    } as any;

    g.append('path')
      .datum(backgroundArc)
      .attr('d', arc as any)
      .attr('fill', '#2a2e39')
      .attr('opacity', 0.35);

    // 3 Gauge Zones: Bearish (0-35%), Neutral (35-65%), Bullish (65-100%)
    // -Math.PI / 2 is the left end, Math.PI / 2 is the right end
    const totalAngle = Math.PI; // 180 degrees
    
    // Zone 1: Bearish (0% to 35%) -> Angle: -Math.PI/2 to (-Math.PI/2 + 0.35 * Math.PI)
    const bearArcObj: d3.DefaultArcObject = {
      startAngle: -Math.PI / 2,
      endAngle: -Math.PI / 2 + (0.35 * totalAngle),
      innerRadius: innerRadius,
      outerRadius: outerRadius
    } as any;

    g.append('path')
      .datum(bearArcObj)
      .attr('d', arc as any)
      .attr('fill', 'url(#gauge-bearish-grad)')
      .attr('class', 'transition-all duration-300');

    // Zone 2: Neutral (35% to 65%)
    const neutralArcObj: d3.DefaultArcObject = {
      startAngle: -Math.PI / 2 + (0.35 * totalAngle),
      endAngle: -Math.PI / 2 + (0.65 * totalAngle),
      innerRadius: innerRadius,
      outerRadius: outerRadius
    } as any;

    g.append('path')
      .datum(neutralArcObj)
      .attr('d', arc as any)
      .attr('fill', 'url(#gauge-neutral-grad)')
      .attr('class', 'transition-all duration-300');

    // Zone 3: Bullish (65% to 100%)
    const bullArcObj: d3.DefaultArcObject = {
      startAngle: -Math.PI / 2 + (0.65 * totalAngle),
      endAngle: Math.PI / 2,
      innerRadius: innerRadius,
      outerRadius: outerRadius
    } as any;

    g.append('path')
      .datum(bullArcObj)
      .attr('d', arc as any)
      .attr('fill', 'url(#gauge-bullish-grad)')
      .attr('class', 'transition-all duration-300');

    // Sleek Needle Indicator
    const needleGroup = g.append('g')
      .attr('class', 'needle-group');

    // Needle Cap Center Circle
    needleGroup.append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', 8)
      .attr('fill', '#1e222d')
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 2);

    needleGroup.append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', 3)
      .attr('fill', '#60a5fa');

    // Draw the actual pointy needle pointer
    // Pointy polygon pointing straight up
    const needleLength = radius - 10;
    const needleWidth = 4;
    
    const needlePath = `M ${-needleWidth} 0 L 0 ${-needleLength} L ${needleWidth} 0 Z`;
    
    const needlePointer = needleGroup.append('path')
      .attr('d', needlePath)
      .attr('fill', '#60a5fa')
      .attr('stroke', '#2563eb')
      .attr('stroke-width', 0.5)
      .attr('stroke-linejoin', 'round');

    // Target rotation angle based on Sentiment Score (0 to 100)
    // 0 -> -90 degrees, 50 -> 0 degrees, 100 -> +90 degrees
    const targetAngleDegrees = -90 + (sentiment * 1.8);

    // Smoothly animate the needle rotation using the transition api of D3
    needlePointer
      .transition()
      .duration(1200)
      .ease(d3.easeElasticOut.amplitude(0.95).period(0.6))
      .attr('transform', `rotate(${targetAngleDegrees})`);

    // Dynamic label descriptions
    let sentimentDescAr = 'محايد';
    let sentimentDescEn = 'Neutral';

    if (sentiment >= 80) {
      sentimentDescAr = 'صعودي قوي جداً';
      sentimentDescEn = 'Extreme Bullish';
    } else if (sentiment >= 60) {
      sentimentDescAr = 'صعودي (إيجابي)';
      sentimentDescEn = 'Bullish Sentiment';
    } else if (sentiment > 40) {
      sentimentDescAr = 'محايد (متذبذب)';
      sentimentDescEn = 'Neutral Market';
    } else if (sentiment > 20) {
      sentimentDescAr = 'هبوطي (سلبي)';
      sentimentDescEn = 'Bearish Sentiment';
    } else {
      sentimentDescAr = 'هبوطي قوي جداً';
      sentimentDescEn = 'Extreme Bearish';
    }

    const currentDesc = language === 'ar' ? sentimentDescAr : sentimentDescEn;

    // Append bottom text details (Sentiment % & Label)
    const textGroup = g.append('g')
      .attr('transform', `translate(0, 15)`);

    // Score Value
    textGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('class', 'font-mono text-lg font-black fill-white tracking-widest')
      .text(`${sentiment.toFixed(0)}%`);

    // State Description text
    textGroup.append('text')
      .attr('y', 14)
      .attr('text-anchor', 'middle')
      .attr('class', 'font-sans text-[10.5px] font-extrabold')
      .attr('fill', sentiment >= 60 ? '#34d399' : sentiment > 40 ? '#fbbf24' : '#f87171')
      .text(currentDesc);

  }, [sentiment, signal, language]);

  return (
    <div className="flex flex-col items-center justify-center relative bg-black/35 rounded-2xl border border-[#2a2e39]/50 p-4 shadow-inner">
      <div className="w-[190px] h-[120px] relative flex items-center justify-center overflow-hidden">
        <svg ref={svgRef} className="w-full h-full overflow-visible"></svg>
      </div>
      
      {/* Dynamic legends under the gauge */}
      <div className="flex justify-between w-full mt-2 px-2 text-[8.5px] font-black font-mono tracking-widest text-gray-500 uppercase">
        <span className="text-red-400">{language === 'ar' ? 'هبوط' : 'Bear'}</span>
        <span className="text-yellow-400">{language === 'ar' ? 'محايد' : 'Neut'}</span>
        <span className="text-emerald-400">{language === 'ar' ? 'صعود' : 'Bull'}</span>
      </div>
    </div>
  );
}
