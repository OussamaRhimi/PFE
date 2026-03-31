import { Component, HostListener, signal, OnInit, OnDestroy, inject, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicNavbarComponent } from '../../components/public-navbar/public-navbar.component';
import { PublicFooterComponent } from '../../components/public-footer/public-footer.component';
import { I18nService } from '../../services/i18n.service';
import { LucideAngularModule, type LucideIconData } from 'lucide-angular';
import {
  ArrowRight,
  Award,
  BarChart3,
  Building2,
  CheckCircle,
  Container,
  Database,
  FileText,
  Globe,
  Layers,
  Mail,
  MapPin,
  Phone,
  Server,
  Shield,
  Upload,
  Users,
  Activity,
  Zap,
  Wifi, Signal, BatteryFull
} from 'lucide-angular/src/icons';
import { RevealOnScrollDirective } from '../../components/reveal-on-scroll.directive';

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
  imports: [
    RouterLink,
    LucideAngularModule,
    RevealOnScrollDirective,
    PublicNavbarComponent,
    PublicFooterComponent
  ],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent implements OnInit, OnDestroy {

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
      title: 'home.feat.easyUpload.title',
      description: 'home.feat.easyUpload.desc',
    },
    {
      icon: Database,
      title: 'home.feat.parsing.title',
      description: 'home.feat.parsing.desc',
    },
    {
      icon: FileText,
      title: 'home.feat.template.title',
      description: 'home.feat.template.desc',
    },
    {
      icon: BarChart3,
      title: 'home.feat.assessment.title',
      description: 'home.feat.assessment.desc',
    },
    {
      icon: Zap,
      title: 'home.feat.matching.title',
      description: 'home.feat.matching.desc',
    },
    {
      icon: Shield,
      title: 'home.feat.gdpr.title',
      description: 'home.feat.gdpr.desc',
    },
  ];

  readonly stats = signal<StatItem[]>([
    { value: '500+', label: 'home.stats.cvProcessed', target: 500, suffix: '+', displayValue: '0+' },
    { value: '95%', label: 'home.stats.accuracy', target: 95, suffix: '%', displayValue: '0%' },
    { value: '60%', label: 'home.stats.timeSaved', target: 60, suffix: '%', displayValue: '0%' },
    { value: '24/7', label: 'home.stats.availability', displayValue: '24/7' },
  ]);

  readonly techStack: TechStackItem[] = [
    { icon: Layers, category: 'home.stack.cat.frontend', name: 'Angular' },
    { icon: Server, category: 'home.stack.cat.backend', name: 'Strapi' },
    { icon: Database, category: 'home.stack.cat.database', name: 'PostgreSQL' },
    { icon: Container, category: 'home.stack.cat.deploy', name: 'Docker' },
  ];

  readonly expertise: string[] = [
    'home.exp.softDev',
    'home.exp.ai',
    'home.exp.cloud',
    'home.exp.digital',
  ];
  readonly productName = 'ioHire';
  readonly companyName = 'iOvision';
  readonly companyLocation = 'home.company.reach';

  public i18n = inject(I18nService);
  typedText = signal('');
  private typingInterval: any;
  private destroyRef = inject(DestroyRef);
  private statsInterval: any;

  get fullText() {
    return this.i18n.t('home.hero.typedText');
  }

  ngOnInit(): void {
    const sub = this.i18n.lang$.subscribe(() => {
      this.startTyping();
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());

    setTimeout(() => {
      this.animateStats();
    }, 300);
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
      const easing = progress * (2 - progress);

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
    this.typedText.set('');
    this.typingInterval = setInterval(() => {
      if (i < this.fullText.length) {
        this.typedText.set(this.fullText.substring(0, i + 1));
        i++;
      } else {
        clearInterval(this.typingInterval);
      }
    }, 100);
  }

  @HostListener('window:scroll')
  onScroll() {
    if (typeof window === 'undefined') return;
    this.scrollY.set(window.scrollY);
  }

  setActiveFeature(index: number) {
    this.activeFeature.set(index);
  }
}
