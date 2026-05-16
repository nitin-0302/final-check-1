import React from 'react';
import { Mail, Instagram, MessageCircle, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-brand-dark text-white py-16">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          <div>
            <h3 className="text-2xl font-serif font-bold mb-6">Rasayan 2026</h3>
            <p className="text-gray-400 leading-relaxed mb-6">
              An annual inter-collegiate fest orchestrated by CLUB REACT within the Department of Chemistry at K J Somaiya College of Science and Commerce.
            </p>
            <div className="flex gap-4">
              <a href="https://instagram.com/clubreact" target="_blank" rel="noopener noreferrer" className="p-2 bg-white/5 rounded-lg hover:bg-brand-primary transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="mailto:rasayan.kjssc@somaiya.edu" className="p-2 bg-white/5 rounded-lg hover:bg-brand-primary transition-colors">
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-bold mb-6">Quick Links</h4>
            <ul className="space-y-4 text-gray-400">
              <li><a href="/events" className="hover:text-brand-primary transition-colors">All Events</a></li>
              <li><a href="/register" className="hover:text-brand-primary transition-colors">Registration</a></li>
              <li><a href="/dashboard" className="hover:text-brand-primary transition-colors">My Dashboard</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-bold mb-6">Contact Us</h4>
            <ul className="space-y-4 text-gray-400">
              <li className="flex items-start gap-3">
                <MapPin className="text-brand-primary w-5 h-5 shrink-0 mt-1" />
                <span>K J Somaiya College of Science & Commerce, Vidyavihar (East), Mumbai - 400077</span>
              </li>
              <li className="flex items-center gap-3">
                <MessageCircle className="text-brand-primary w-5 h-5" />
                <span>+91 81738 46202 (Chairperson)</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="text-brand-primary w-5 h-5" />
                <span>rasayan.kjssc@somaiya.edu</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-white/5 text-center text-gray-500 text-sm">
          <p>© 2026 Department of Chemistry (Club React). For the Students, By the Students, Of the Students.</p>
        </div>
      </div>
    </footer>
  );
}
