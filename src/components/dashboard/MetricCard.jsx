import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendUp = true,
  iconColor = "bg-blue-500" 
}) {
  return (
    <Card className="relative overflow-hidden shadow-lg border-0 bg-white/80 backdrop-blur">
      <div className={`absolute top-0 right-0 w-32 h-32 ${iconColor} opacity-5 rounded-full transform translate-x-12 -translate-y-12`} />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-600 mb-2">{title}</p>
            <CardTitle className="text-3xl font-bold text-slate-900">
              {value}
            </CardTitle>
          </div>
          <div className={`${iconColor} p-3 rounded-xl shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardHeader>
      {trend && (
        <CardContent className="pt-0">
          <div className="flex items-center gap-1.5 text-sm">
            {trendUp ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
            <span className={trendUp ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
              {trend}
            </span>
            <span className="text-slate-500">vs last period</span>
          </div>
        </CardContent>
      )}
    </Card>
  );
}