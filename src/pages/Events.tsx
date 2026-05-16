import React from 'react';
import { EVENTS } from '../constants/events';
import { motion } from 'motion/react';
import { MapPin, Monitor, CheckCircle } from 'lucide-react';
import { AtomicVector, BeakerVector } from '../components/ChemistryVectors';

export default function Events() {
  const [filter, setFilter] = React.useState<'all' | 'offline' | 'online'>('all');

  const filteredEvents = EVENTS.filter(e => filter === 'all' || e.type === filter);

  return (
    <div className="pt-24 pb-20 min-h-screen bg-bg-paper relative overflow-hidden">
      {/* Decorative Vectors */}
      <div className="absolute top-40 -left-20 w-80 h-80 text-brand-primary/5 -rotate-12 pointer-events-none">
        <BeakerVector />
      </div>
      <div className="absolute bottom-20 -right-20 w-96 h-96 text-brand-primary/5 rotate-12 pointer-events-none">
        <AtomicVector />
      </div>

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <header className="mb-12 text-center">
          <h1 className="text-5xl font-serif text-brand-dark mb-4">Scientific Arena</h1>
          <p className="text-text-muted text-lg max-w-2xl mx-auto">
            Explore our meticulously crafted events centered around the five elements of nature.
          </p>
          
          <div className="flex justify-center gap-4 mt-8">
            {(['all', 'offline', 'online'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-6 py-2 rounded-full text-sm font-semibold capitalize transition-all ${
                  filter === t 
                    ? 'bg-brand-primary text-white shadow-lg' 
                    : 'bg-white text-text-muted hover:bg-brand-soft hover:text-brand-primary'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredEvents.map((event, idx) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              key={event.id}
              className="glass-card flex flex-col rounded-3xl overflow-hidden group hover:shadow-2xl transition-all duration-500"
            >
              <div className="p-8 flex-1">
                <div className="flex justify-between items-start mb-6">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                    event.type === 'offline' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {event.type === 'offline' ? <MapPin className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
                    {event.type}
                  </span>
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{event.category}</span>
                </div>
                
                <h3 className="text-2xl font-bold text-brand-dark mb-4 group-hover:text-brand-primary transition-colors">{event.name}</h3>
                <p className="text-text-muted text-sm leading-relaxed mb-6 line-clamp-4">{event.description}</p>
                
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-brand-primary uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle className="w-3 h-3" /> Rules Highlights
                  </h4>
                  <ul className="text-xs text-text-muted space-y-1 pl-5 list-disc italic">
                    {event.rules.slice(0, 3).map((rule, i) => (
                      <li key={i}>{rule}</li>
                    ))}
                    {event.rules.length > 3 && <li>And more...</li>}
                  </ul>
                </div>
              </div>
              
              <div className="p-6 bg-brand-soft border-t border-brand-primary/5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold text-text-muted">Winners</p>
                  <p className="text-sm font-bold text-brand-dark">{event.winners}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-text-muted">
                    {event.type === 'online' ? 'Deadline' : 'Date'}
                  </p>
                  <p className="text-sm font-bold text-brand-dark">
                    {event.deadline || '16 Dec 2026'}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
