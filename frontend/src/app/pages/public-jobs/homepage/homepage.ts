import { Component, HostListener, signal, OnInit, OnDestroy, inject, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, type LucideIconData } from 'lucide-angular';
// ✅ À UTILISER :
import { 
  ArrowRight, Award, BarChart3, Building2, CheckCircle, 
  Container, Database, FileText, Globe, Layers, Mail, 
  MapPin, Phone, Server, Shield, Upload, Users, Activity, 
  Zap, Wifi, Signal, BatteryFull 
} from 'lucide-angular'; // On s'arrête à 'lucide-angular'
import { RevealOnScrollDirective } from '../../../shared/animations/reveal-on-scroll.directive';
type FeatureItem = {
  icon: LucideIconData;
  title: string;
  description: string;
};

type StatItem = {
  value: string;
  label: string;
  target?: number;
  suffix?: string;
  displayValue?: string;
};

type TechStackItem = {
  icon: LucideIconData;
  category: string;
  name: string;
};

@Component({
  selector: 'app-home-page',
  standalone: true, 
  imports: [RouterLink, LucideAngularModule, RevealOnScrollDirective],
  templateUrl: './homepage.html',  
  styleUrl: './homepage.css',      
})
export class HomePage {

  readonly scrollY = signal(0);
  readonly activeFeature = signal(0);

  readonly iconWifi: LucideIconData = Wifi;
  readonly iconSignal: LucideIconData = Signal;
  readonly iconBatteryFull: LucideIconData = BatteryFull;
  readonly iconUpload: LucideIconData = Upload;
  readonly iconDatabase: LucideIconData = Database;
  readonly iconShield: LucideIconData = Shield;
  readonly iconBarChart3: LucideIconData = BarChart3;
  readonly iconZap: LucideIconData = Zap;
  readonly iconMapPin: LucideIconData = MapPin;
  readonly iconBuilding2: LucideIconData = Building2;
  readonly iconAward: LucideIconData = Award;
  readonly iconArrowRight: LucideIconData = ArrowRight;
  readonly iconCheckCircle: LucideIconData = CheckCircle;
  readonly iconGlobe: LucideIconData = Globe;
  readonly iconMail: LucideIconData = Mail;
  readonly iconPhone: LucideIconData = Phone;
  readonly iconUsers: LucideIconData = Users;
  readonly iconActivity: LucideIconData = Activity;

  readonly features: FeatureItem[] = [
    {
      icon: Upload,
      title: 'Easy CV Upload',
      description: 'Candidates submit CVs directly with optional pre-filling forms.',
    },
    {
      icon: Database,
      title: 'Automatic Parsing',
      description: 'Extract and structure name, contact, education, and experience data automatically.',
    },
    {
      icon: FileText,
      title: 'Template Generation',
      description: 'Generate standardized company CV templates for all parsed profiles.',
    },
    {
      icon: BarChart3,
      title: 'Automated Assessment',
      description: 'Score applications by completeness and fit for the open position.',
    },
    {
      icon: Zap,
      title: 'Compatibility Matching',
      description: 'Match candidate profiles against job requirements automatically.',
    },
    {
      icon: Shield,
      title: 'GDPR Compliant',
      description: 'Secure storage and role-based CV view and download controls.',
    },
  ];

  readonly stats = signal<StatItem[]>([
    { value: '500+', label: 'CVs Processed', target: 500, suffix: '+', displayValue: '0+' },
    { value: '95%', label: 'Parsing Accuracy', target: 95, suffix: '%', displayValue: '0%' },
    { value: '60%', label: 'Time Saved', target: 60, suffix: '%', displayValue: '0%' },
    { value: '24/7', label: 'Availability', displayValue: '24/7' },
  ]);

  readonly techStack: TechStackItem[] = [
    { icon: Layers, category: 'Frontend', name: 'Angular' },
    { icon: Server, category: 'Backend', name: 'Strapi' },
    { icon: Database, category: 'Database', name: 'PostgreSQL' },
    { icon: Container, category: 'Deployment', name: 'Docker' },
  ];

  readonly expertise: string[] = [
    'Software Development',
    'AI and Machine Learning',
    'Cloud Solutions',
    'Digital Transformation',
  ];
  readonly productName = 'ioHire';
  readonly companyName = 'iOvision';
  readonly companyLocation = 'Sfax, Tunisia';

  typedText = signal('');
  fullText = 'CV Parser and Evaluation Platform';
  private typingInterval: any;
  private destroyRef = inject(DestroyRef); // optionnel pour nettoyage

  private statsInterval: any;

  ngOnInit(): void {
    // Démarrer l'effet après un délai pour laisser l'animation d'entrée se terminer
    setTimeout(() => {
      this.startTyping();
      this.animateStats();
    }, 300); // délai correspondant à peu près à landing-animate--3
  }

  animateStats() {
    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;
    const currentStats = this.stats();
    let step = 0;

    this.statsInterval = setInterval(() => {
      step++;
      const progress = step / steps;
      const easing = progress * (2 - progress); // ease-out quad

      const updatedStats = currentStats.map(stat => {
        if (stat.target != null && stat.suffix != null) {
          const currentVal = Math.round(stat.target * easing);
          return { ...stat, displayValue: currentVal + stat.suffix };
        }
        return stat;
      });

      this.stats.set(updatedStats);

      if (step >= steps) {
        clearInterval(this.statsInterval);
      }
    }, interval);
  }

  ngOnDestroy(): void {
    if (this.typingInterval) {
      clearInterval(this.typingInterval);
    }
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }
  }

  startTyping() {
    let i = 0;
    this.typedText.set(''); // réinitialiser au cas où
    this.typingInterval = setInterval(() => {
      if (i < this.fullText.length) {
        this.typedText.set(this.fullText.substring(0, i + 1));
        i++;
      } else {
        clearInterval(this.typingInterval);
      }
    }, 100); // vitesse de frappe (100ms par lettre)
  }


  private rafId: number | null = null;

  @HostListener('window:scroll')
  onScroll() {
    if (typeof window === 'undefined') return;
    
    if (this.rafId) return; // Already throttled
    
    this.rafId = requestAnimationFrame(() => {
      this.scrollY.set(window.scrollY);
      this.rafId = null;
    });
  }

  setActiveFeature(index: number) {
    this.activeFeature.set(index);
  }
}
