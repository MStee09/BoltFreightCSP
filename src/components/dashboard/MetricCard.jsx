import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../../utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";

export default function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  trendUp = true,
  iconColor = "bg-blue-500",
  linkTo,
  filterParam,
  previousValue,
  description
}) {
  const CardWrapper = linkTo ? Link : 'div';
  const linkUrl = linkTo ? `${createPageUrl(linkTo)}${filterParam ? `?filter=${filterParam}` : ''}` : '';
  const cardProps = linkTo ? { to: linkUrl, className: "block" } : {};

  const calculatedTrend = previousValue !== undefined && previousValue !== null
    ? previousValue === 0
      ? (value > 0 ? 100 : 0)
      : Math.round(((value - previousValue) / previousValue) * 100)
    : null;

  const isTrendUp = calculatedTrend !== null ? calculatedTrend >= 0 : trendUp;
  const trendDisplay = calculatedTrend !== null ? `${calculatedTrend > 0 ? '+' : ''}${calculatedTrend}%` : trend;

  const cardContent = (
    <Card className={`relative overflow-hidden shadow-lg border-0 bg-white/80 backdrop-blur h-full ${linkTo ? 'hover:shadow-xl transition-all duration-200 cursor-pointer' : ''}`}>
      <div className={`absolute top-0 right-0 w-32 h-32 ${iconColor} opacity-5 rounded-full transform translate-x-12 -translate-y-12`} />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-600 mb-2">{title}</p>
            <CardTitle className="text-3xl font-bold text-slate-900">
              {value}
            </CardTitle>
          </div>
          <div className={`${iconColor} p-3 rounded-xl shadow-lg flex-shrink-0`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardHeader>
      {(trendDisplay || calculatedTrend !== null) && (
        <CardContent className="pt-0">
          <div className="flex items-center gap-1.5 text-sm">
            {isTrendUp ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
            <span className={isTrendUp ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
              {trendDisplay}
            </span>
            <span className="text-slate-500">vs last week</span>
          </div>
        </CardContent>
      )}
    </Card>
  );

  if (description) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="h-full">
              <CardWrapper {...cardProps}>
                {cardContent}
              </CardWrapper>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-sm">{description}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <CardWrapper {...cardProps}>
      {cardContent}
    </CardWrapper>
  );
}