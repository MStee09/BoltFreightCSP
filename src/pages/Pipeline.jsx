
import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Customer, Carrier, Tariff, CSPEvent, Task, Interaction, Alert, Shipment, LostOpportunity, ReportSnapshot } from "../api/entities";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { PlusCircle, MoreHorizontal } from "lucide-react";
import { Skeleton } from "../components/ui/skeleton";
import { Badge } from "../components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import NewEventSheet from "../components/pipeline/NewEventSheet";
import CspEventDetailSheet from "../components/pipeline/CspEventDetailSheet";

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

const getSlaColor = (days) => {
    if (days > 14) return 'border-l-red-500';
    if (days > 7) return 'border-l-amber-500';
    return 'border-l-green-500';
}

const StageColumn = ({ stage, events, customers, stageRef, onEventClick }) => {
  return (
    <div className="w-64 flex-shrink-0" ref={stageRef}>
      <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2 px-2">
        {stage.replace(/_/g, ' ')} ({events.length})
      </h2>
      <Droppable droppableId={stage}>
        {(provided, snapshot) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={`bg-slate-100/70 rounded-xl p-2 min-h-[60vh] h-full transition-colors ${snapshot.isDraggingOver ? 'bg-blue-50' : ''}`}
          >
            {events.length > 0 ? events.map((event, index) => {
              const customer = customers.find(c => c.id === event.customer_id);
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
                        className={`bg-white hover:shadow-lg transition-shadow border-l-4 cursor-pointer ${getSlaColor(event.days_in_stage || 0)} ${snapshot.isDragging ? 'shadow-xl ring-2 ring-blue-500' : ''}`}
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
                        <CardContent className="p-2 pt-0">
                          <p className="text-xs text-slate-600 mb-1 truncate">{customer?.name || "..."}</p>
                          <p className="text-xs text-slate-500 mb-2 truncate">Assigned: {event.assigned_to || "Unassigned"}</p>
                          <div className="flex justify-between items-center">
                            <Badge variant={event.priority === 'urgent' ? 'destructive' : 'secondary'} className="capitalize text-xs py-0 px-1.5 h-5">{event.priority}</Badge>
                            <span className="text-xs text-slate-500">{event.days_in_stage || 0}d</span>
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
  const queryClient = useQueryClient();
  const [isNewEventSheetOpen, setIsNewEventSheetOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const rfpSentRef = useRef(null);
  const containerRef = useRef(null);

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

  useEffect(() => {
    if (!isLoadingEvents && rfpSentRef.current && containerRef.current) {
      const rfpSentPosition = rfpSentRef.current.offsetLeft;
      containerRef.current.scrollTo({
        left: rfpSentPosition,
        behavior: 'smooth'
      });
    }
  }, [isLoadingEvents]);

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
    acc[stage] = events.filter(e => e.stage === stage).sort((a,b) => (a.priority === 'urgent' ? -1 : 1));
    return acc;
  }, {});

  const handleEventClick = (eventId) => {
    setSelectedEventId(eventId);
    setIsDetailSheetOpen(true);
  };

  return (
    <>
      <div className="h-full flex flex-col overflow-hidden">
        <div className="p-4 lg:p-8 flex-shrink-0 bg-white border-b border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">CSP Pipeline</h1>
            <Button className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap" onClick={() => setIsNewEventSheetOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Event
            </Button>
          </div>
          <p className="text-slate-600">Track deals from discovery to renewal.</p>
        </div>
        <div ref={containerRef} className="flex-1 p-6 lg:p-8 pt-6 overflow-x-auto overflow-y-hidden">
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-6 items-start h-full">
              {isLoadingEvents ? Array(6).fill(0).map((_, i) => (
                  <div key={i} className="w-80 flex-shrink-0">
                      <Skeleton className="h-6 w-40 mb-3" />
                      <div className="bg-slate-100/70 rounded-xl p-2 h-full">
                          <Skeleton className="h-28 w-full mb-3" />
                          <Skeleton className="h-28 w-full mb-3" />
                          <Skeleton className="h-28 w-full mb-3" />
                      </div>
                  </div>
              )) : STAGES.map((stage) => (
                <StageColumn
                  key={stage}
                  stage={stage}
                  events={eventsByStage[stage]}
                  customers={customers}
                  stageRef={stage === 'rfp_sent' ? rfpSentRef : null}
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
      <CspEventDetailSheet
        isOpen={isDetailSheetOpen}
        onOpenChange={setIsDetailSheetOpen}
        eventId={selectedEventId}
      />
    </>
  );
}
