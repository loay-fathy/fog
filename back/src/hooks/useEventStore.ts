import { useState, useEffect } from 'react';
import { Event } from '../types/event';

export const useEventStore = () => {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    const storedEvents = localStorage.getItem('calendar-events');
    if (storedEvents) {
      setEvents(JSON.parse(storedEvents));
    }
  }, []);

  const saveEvents = (newEvents: Event[]) => {
    setEvents(newEvents);
    localStorage.setItem('calendar-events', JSON.stringify(newEvents));
  };

  const addEvent = (event: Event) => {
    saveEvents([...events, event]);
  };

  const updateEvent = (updatedEvent: Event) => {
    saveEvents(events.map(event => 
      event.id === updatedEvent.id ? updatedEvent : event
    ));
  };

  const deleteEvent = (eventId: string) => {
    saveEvents(events.filter(event => event.id !== eventId));
  };

  const getEventsByDate = (date: string) => {
    return events.filter(event => event.date === date);
  };

  return {
    events,
    addEvent,
    updateEvent,
    deleteEvent,
    getEventsByDate,
  };
};