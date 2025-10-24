
import React, { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { Customer, Carrier, Tariff, CSPEvent, Task, Interaction, Alert, Shipment, LostOpportunity, ReportSnapshot } from "../api/entities";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { PlusCircle, MoreHorizontal, ArrowRight, Users, FileText, AlertTriangle, Filter } from "lucide-react";
import { Skeleton } from "../components/ui/skeleton";
import { Badge } from "../components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuSeparator, DropdownMenuLabel } from "../components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";
import NewEventSheet from "../components/pipeline/NewEventSheet";
import { createPageUrl } from "../utils";
import { differenceInDays } from "date-fns";

const STAGES = [
  "discovery",
  "data_room_ready",
  "rfp_sent",
  "qa_round",
  "round_1",
  "final_offers",
  "awarded",
  "implementation",
  "validation",
  "live",
  "renewal_watch"
];

const STAGE_DEFINITIONS = {
  discovery: "Initial research and qualification of potential RFP opportunities",
  data_room_ready: "Customer data and requirements have been collected and organized",
  rfp_sent: "Request for Proposal has been sent to carriers",
  qa_round: "Internal validation and quality assurance before sending rates",
  round_1: "First round of carrier responses received and under review",
  final_offers: "Final pricing negotiations and carrier selection in progress",
  awarded: "Contract awarded, awaiting tariff finalization",
  implementation: "Tariff being implemented in systems",
  validation: "Verifying tariff accuracy and data integrity",
  live: "New tariff is active and in production",
  renewal_watch: "Monitoring for upcoming renewal opportunities"
};

const getSlaColor = (days) => {
    if (days >= 30) return 'border-l-red-500 border-l-[6px]';
    if (days >= 21) return 'border-l-orange-500 border-l-[5px]';
    if (days >= 14) return 'border-l-amber-400 border-l-4';
    return 'border-l-green-500';
}

const getAgingBadge = (days) => {
    if (days >= 30) return <Badge variant="destructive" className="text-xs">Stale</Badge>;
    if (days >= 21) return <Badge variant="outline" className="text-xs border-orange-500 text-orange-700">Aging</Badge>;
    return null;
}

const StageColumn = ({ stage, events, customers, tariffs, stageRef, onEventClick }) => {
  return (
    <div className="w-56 flex-shrink-0" ref={stageRef}>
      <div className="flex items-center gap-2 mb-2 px-2">
        <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
          {stage.replace(/_/g, ' ')} ({events.length})
        </h2>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <AlertTriangle className="w-3 h-3 text-slate-400 hover:text-slate-600" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">{STAGE_DEFINITIONS[stage]}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <Droppable droppableId={stage}>
        {(provided, snapshot) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={`rounded-xl p-2 min-h-[50vh] h-full transition-colors ${snapshot.isDraggingOver ? 'bg-blue-100' : 'bg-slate-50'}`}
          >
            {events.length > 0 ? events.map((event, index) => {
              const customer = customers.find(c => c.id === event.customer_id);
              const relatedTariff = tariffs.find(t => t.csp_event_id === event.id);
              const daysInStage = event.days_in_stage || 0;
              const agingBadge = getAgingBadge(daysInStage);

              return (
                <Draggable key={event.id} draggableId={event.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className="mb-3"
                    >
                      <Card
                        className={`bg-white hover:shadow-lg transition-shadow cursor-pointer ${getSlaColor(daysInStage)} ${snapshot.isDragging ? 'shadow-xl ring-2 ring-blue-500' : ''} ${daysInStage >= 30 ? 'opacity-75' : ''}`}
                        onClick={(e) => {
                          if (!e.defaultPrevented) {
                            onEventClick(event.id);
                          }
                        }}
                      >
                        <CardHeader className="p-2 pb-1 flex-row items-start justify-between">
                            <CardTitle className="text-xs font-semibold text-slate-900 leading-snug">{event.title}</CardTitle>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 -mt-1 -mr-1"
                                      onClick={(e) => e.preventDefault()}
                                    >
                                      <MoreHorizontal className="w-3 h-3" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => onEventClick(event.id)}>View Details</DropdownMenuItem>
                                    <DropdownMenuItem>Add Note</DropdownMenuItem>
                                    <DropdownMenuItem>Assign Owner</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </CardHeader>
                        <CardContent className="p-2 pt-0 space-y-2">
                          <p className="text-xs text-slate-600 mb-1 truncate">{customer?.name || "..."}</p>
                          <p className="text-xs text-slate-500 mb-2 truncate">Assigned: {event.assigned_to || "Unassigned"}</p>

                          {(customer || relatedTariff) && (
                            <div className="flex gap-1 mb-2">
                              {customer && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  asChild
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Link to={createPageUrl(`Customers?detailId=${customer.id}`)}>
                                    <Users className="w-3 h-3 mr-1" />
                                    Customer
                                  </Link>
                                </Button>
                              )}
                              {relatedTariff && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  asChild
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Link to={createPageUrl(`TariffDetail?id=${relatedTariff.id}`)}>
                                    <FileText className="w-3 h-3 mr-1" />
                                    Tariff
                                  </Link>
                                </Button>
                              )}
                            </div>
                          )}

                          <div className="flex justify-between items-center">
                            <div className="flex gap-1">
                              <Badge variant={event.priority === 'urgent' ? 'destructive' : 'secondary'} className="capitalize text-xs py-0 px-1.5 h-5">{event.priority}</Badge>
                              {agingBadge}
                            </div>
                            <span className="text-xs text-slate-500 font-medium">{daysInStage}d</span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </Draggable>
              );
            }) : (
                <div className="flex items-center justify-center h-full text-sm text-slate-500 p-4 text-center">
                    <div>Drag cards here or create a new event.</div>
                </div>
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};


export default function PipelinePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [isNewEventSheetOpen, setIsNewEventSheetOpen] = useState(false);
  const [filterAssignee, setFilterAssignee] = useState(null);
  const [filterCustomer, setFilterCustomer] = useState(null);
  const [filterMode, setFilterMode] = useState(null);
  const [showStaleOnly, setShowStaleOnly] = useState(false);
  const rfpSentRef = useRef(null);
  const containerRef = useRef(null);
  const stageRefs = useRef({});

  const { data: events = [], isLoading: isLoadingEvents } = useQuery({
    queryKey: ["csp_events"],
    queryFn: () => CSPEvent.list(),
    initialData: [],
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => Customer.list(),
    initialData: []
  });

  const { data: tariffs = [] } = useQuery({
    queryKey: ["tariffs"],
    queryFn: () => Tariff.list(),
    initialData: []
  });

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (filterAssignee && e.assigned_to !== filterAssignee) return false;
      if (filterCustomer && e.customer_id !== filterCustomer) return false;
      if (filterMode && e.mode !== filterMode) return false;
      if (showStaleOnly && (e.days_in_stage || 0) < 30) return false;
      return true;
    });
  }, [events, filterAssignee, filterCustomer, filterMode, showStaleOnly]);

  const metrics = useMemo(() => {
    const activeEvents = filteredEvents.filter(e => !['live', 'renewal_watch'].includes(e.stage));
    const totalDays = activeEvents.reduce((sum, e) => sum + (e.days_in_stage || 0), 0);
    const avgDays = activeEvents.length > 0 ? (totalDays / activeEvents.length).toFixed(1) : 0;

    const awardedCount = filteredEvents.filter(e => ['awarded', 'implementation', 'validation', 'live'].includes(e.stage)).length;
    const totalOpportunities = filteredEvents.filter(e => e.stage !== 'renewal_watch').length;
    const winRate = totalOpportunities > 0 ? ((awardedCount / totalOpportunities) * 100).toFixed(0) : 0;

    const staleCount = activeEvents.filter(e => (e.days_in_stage || 0) >= 30).length;

    return {
      activeCount: activeEvents.length,
      avgDays,
      winRate,
      staleCount
    };
  }, [filteredEvents]);

  const uniqueAssignees = useMemo(() => {
    return [...new Set(events.map(e => e.assigned_to).filter(Boolean))];
  }, [events]);

  const uniqueModes = useMemo(() => {
    return [...new Set(events.map(e => e.mode).filter(Boolean))];
  }, [events]);

  useEffect(() => {
    if (!isLoadingEvents && containerRef.current) {
      const searchParams = new URLSearchParams(location.search);
      const targetStage = searchParams.get('stage');
      const targetEventId = searchParams.get('event');

      console.log('Scroll effect triggered', {
        isLoadingEvents,
        hasContainer: !!containerRef.current,
        targetStage,
        targetEventId,
        hasTargetRef: targetStage ? !!stageRefs.current[targetStage] : 'N/A'
      });

      if (targetEventId) {
        const event = events.find(e => e.id === targetEventId);
        if (event) {
          navigate(createPageUrl(`CspEventDetail?id=${targetEventId}`));
          setIsDetailSheetOpen(true);

          const eventStage = event.stage;
          if (eventStage && stageRefs.current[eventStage]) {
            setTimeout(() => {
              const element = stageRefs.current[eventStage];
              const container = containerRef.current;

              if (element && container) {
                const elementLeft = element.offsetLeft;
                const containerWidth = container.offsetWidth;
                const elementWidth = element.offsetWidth;
                const scrollPosition = elementLeft - (containerWidth / 2) + (elementWidth / 2);

                container.scrollTo({
                  left: Math.max(0, scrollPosition),
                  behavior: 'smooth'
                });
              }
            }, 100);
          }
        }
        return;
      }

      setTimeout(() => {
        if (targetStage && stageRefs.current[targetStage]) {
          const element = stageRefs.current[targetStage];
          const container = containerRef.current;

          console.log('Element exists:', !!element);
          console.log('Container exists:', !!container);

          if (element && container) {
            const elementLeft = element.offsetLeft;
            const containerWidth = container.offsetWidth;
            const elementWidth = element.offsetWidth;

            const scrollPosition = elementLeft - (containerWidth / 2) + (elementWidth / 2);

            console.log('Scroll calculations:', {
              elementLeft,
              containerWidth,
              elementWidth,
              scrollPosition,
              finalPosition: Math.max(0, scrollPosition)
            });

            container.scrollTo({
              left: Math.max(0, scrollPosition),
              behavior: 'smooth'
            });
          }
        } else if (rfpSentRef.current) {
          const element = rfpSentRef.current;
          const container = containerRef.current;

          if (element && container) {
            const elementLeft = element.offsetLeft;
            const containerWidth = container.offsetWidth;
            const elementWidth = element.offsetWidth;

            const scrollPosition = elementLeft - (containerWidth / 2) + (elementWidth / 2);

            container.scrollTo({
              left: Math.max(0, scrollPosition),
              behavior: 'smooth'
            });
          }
        }
      }, 200);
    }
  }, [isLoadingEvents, location.search, events]);

  const updateEventMutation = useMutation({
      mutationFn: ({id, data}) => CSPEvent.update(id, data),
      onSuccess: (updatedEvent, variables) => {
          queryClient.invalidateQueries({queryKey: ["csp_events"]});

          if(variables.interactionData){
              Interaction.create(variables.interactionData).then(() => {
                  queryClient.invalidateQueries({queryKey: ["interactions", updatedEvent.customer_id, 'customer']});
                  queryClient.invalidateQueries({queryKey: ["interactions"]});
              });
          }

          if(variables.carrierInteractions && variables.carrierInteractions.length > 0){
              Promise.all(
                  variables.carrierInteractions.map(carrierInteraction =>
                      Interaction.create(carrierInteraction)
                  )
              ).then(() => {
                  variables.carrierInteractions.forEach(ci => {
                      queryClient.invalidateQueries({queryKey: ["interactions", ci.entity_id, 'carrier']});
                  });
                  queryClient.invalidateQueries({queryKey: ["interactions"]});
              });
          }
      }
  });

  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;

    if (!destination) {
      return;
    }

    if (source.droppableId !== destination.droppableId) {
      const movedEvent = events.find(e => e.id === draggableId);

      if (movedEvent) {
          const interactionData = {
              entity_type: 'customer',
              entity_id: movedEvent.customer_id,
              interaction_type: 'csp_stage_update',
              summary: `CSP Stage: ${source.droppableId.replace(/_/g, ' ')} → ${destination.droppableId.replace(/_/g, ' ')}`,
              details: `The deal "${movedEvent.title}" was moved to the "${destination.droppableId.replace(/_/g, ' ')}" stage.`,
              metadata: {
                  from_stage: source.droppableId,
                  to_stage: destination.droppableId,
                  csp_event_id: movedEvent.id,
              }
          };

          const carrierInteractions = [];
          if (movedEvent.carrier_ids && movedEvent.carrier_ids.length > 0) {
              movedEvent.carrier_ids.forEach(carrierId => {
                  carrierInteractions.push({
                      entity_type: 'carrier',
                      entity_id: carrierId,
                      interaction_type: 'csp_stage_update',
                      summary: `CSP Stage: ${source.droppableId.replace(/_/g, ' ')} → ${destination.droppableId.replace(/_/g, ' ')}`,
                      details: `The deal "${movedEvent.title}" was moved to the "${destination.droppableId.replace(/_/g, ' ')}" stage.`,
                      metadata: {
                          from_stage: source.droppableId,
                          to_stage: destination.droppableId,
                          csp_event_id: movedEvent.id,
                          customer_id: movedEvent.customer_id,
                      }
                  });
              });
          }

          updateEventMutation.mutate({
              id: draggableId,
              data: { stage: destination.droppableId, days_in_stage: 0 },
              interactionData: interactionData,
              carrierInteractions: carrierInteractions
          });
      }
    }
  };

  const eventsByStage = STAGES.reduce((acc, stage) => {
    acc[stage] = filteredEvents.filter(e => e.stage === stage).sort((a,b) => (a.priority === 'urgent' ? -1 : 1));
    return acc;
  }, {});

  const activeFilterCount = [filterAssignee, filterCustomer, filterMode, showStaleOnly].filter(Boolean).length;

  const handleEventClick = (eventId) => {
    navigate(createPageUrl(`CspEventDetail?id=${eventId}`));
    setIsDetailSheetOpen(true);
  };

  return (
    <>
      <div className="h-full flex flex-col overflow-hidden">
        <div className="p-4 lg:p-6 flex-shrink-0 bg-white border-b border-slate-200">
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-2xl font-bold text-slate-900">CSP Pipeline</h1>
            <Button className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap" onClick={() => setIsNewEventSheetOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Event
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex items-center gap-3 text-sm flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-700">Active:</span>
                <span className="text-slate-900 font-bold">{metrics.activeCount}</span>
              </div>
              <div className="w-px h-4 bg-slate-300"></div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-700">Avg Days:</span>
                <span className="text-slate-900 font-bold">{metrics.avgDays}</span>
              </div>
              <div className="w-px h-4 bg-slate-300"></div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-700">Win:</span>
                <span className="text-slate-900 font-bold">{metrics.winRate}%</span>
              </div>
              {metrics.staleCount > 0 && (
                <>
                  <div className="w-px h-4 bg-slate-300"></div>
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span className="font-semibold text-red-700">{metrics.staleCount} Stale</span>
                  </div>
                </>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="whitespace-nowrap flex-shrink-0">
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-2">{activeFilterCount}</Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Filter By</DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuCheckboxItem
                  checked={showStaleOnly}
                  onCheckedChange={setShowStaleOnly}
                >
                  Show Stale Only (30+ days)
                </DropdownMenuCheckboxItem>

                {uniqueAssignees.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Assignee</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setFilterAssignee(null)}>
                      All Assignees
                    </DropdownMenuItem>
                    {uniqueAssignees.map(assignee => (
                      <DropdownMenuCheckboxItem
                        key={assignee}
                        checked={filterAssignee === assignee}
                        onCheckedChange={(checked) => setFilterAssignee(checked ? assignee : null)}
                      >
                        {assignee}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </>
                )}

                {customers.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Customer</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setFilterCustomer(null)}>
                      All Customers
                    </DropdownMenuItem>
                    {customers.slice(0, 10).map(customer => (
                      <DropdownMenuCheckboxItem
                        key={customer.id}
                        checked={filterCustomer === customer.id}
                        onCheckedChange={(checked) => setFilterCustomer(checked ? customer.id : null)}
                      >
                        {customer.name}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </>
                )}

                {uniqueModes.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Mode</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setFilterMode(null)}>
                      All Modes
                    </DropdownMenuItem>
                    {uniqueModes.map(mode => (
                      <DropdownMenuCheckboxItem
                        key={mode}
                        checked={filterMode === mode}
                        onCheckedChange={(checked) => setFilterMode(checked ? mode : null)}
                      >
                        {mode}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </>
                )}

                {activeFilterCount > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => {
                      setFilterAssignee(null);
                      setFilterCustomer(null);
                      setFilterMode(null);
                      setShowStaleOnly(false);
                    }}>
                      Clear All Filters
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div ref={containerRef} className="flex-1 p-4 lg:p-6 overflow-x-auto overflow-y-hidden">
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-4 items-start h-full">
              {isLoadingEvents ? Array(6).fill(0).map((_, i) => (
                  <div key={i} className="w-56 flex-shrink-0">
                      <Skeleton className="h-5 w-32 mb-2" />
                      <div className="bg-slate-100/70 rounded-xl p-2 h-full">
                          <Skeleton className="h-24 w-full mb-2" />
                          <Skeleton className="h-24 w-full mb-2" />
                      </div>
                  </div>
              )) : STAGES.map((stage) => (
                <StageColumn
                  key={stage}
                  stage={stage}
                  events={eventsByStage[stage]}
                  customers={customers}
                  tariffs={tariffs}
                  stageRef={(el) => {
                    if (stage === 'rfp_sent') {
                      rfpSentRef.current = el;
                    }
                    stageRefs.current[stage] = el;
                  }}
                  onEventClick={handleEventClick}
                />
              ))}
            </div>
          </DragDropContext>
        </div>
      </div>
      <NewEventSheet
        isOpen={isNewEventSheetOpen}
        onOpenChange={setIsNewEventSheetOpen}
        customers={customers}
      />
    </>
  );
}
