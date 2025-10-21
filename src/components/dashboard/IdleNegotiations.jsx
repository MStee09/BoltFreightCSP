
import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { PauseCircle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../../utils";
import { ensureArray } from "../utils";

export default function IdleNegotiations({ events, customers }) {
  // Ensure events is an array to prevent potential errors
  const allEvents = ensureArray(events);

  // Fortify: Filter events to only include those truly "idle" (e.g., more than 14 days in stage),
  // aligning with the component's purpose and the empty state message.
  const idleEvents = allEvents.filter(event => event.days_in_stage && event.days_in_stage > 14);

  const safeCustomers = ensureArray(customers);

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
      <CardHeader className="border-b border-slate-100 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <PauseCircle className="w-5 h-5 text-orange-500" />
            Idle Negotiations
          </CardTitle>
          <Link to={createPageUrl("Pipeline")}>
            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
              View Pipeline <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {idleEvents.length > 0 ? (
          <div className="space-y-3">
            {idleEvents.slice(0, 4).map((event) => {
              const customer = safeCustomers.find(c => c.id === event.customer_id);
              return (
                <div
                  key={event.id}
                  className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all bg-white"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-900 mb-1">
                        {event.title}
                      </p>
                      <p className="text-sm text-slate-600">
                        {customer?.name || 'Unknown Customer'}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize text-orange-700 bg-orange-50 border-orange-200">
                      {event.days_in_stage} days stuck
                    </Badge>
                  </div>
                  <div className="text-sm text-slate-500 mt-2">
                    Current Stage: <span className="font-medium capitalize text-slate-700">{event.stage.replace(/_/g, ' ')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <PauseCircle className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-900 font-medium mb-1">Pipeline is Flowing</p>
            <p className="text-sm text-slate-500">No negotiations have been idle for more than 14 days.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
