# Epic 5: Marketing Site & Landing Page

**Epic ID:** EPIC-5
**Priority:** P2 - Medium
**Status:** Draft
**Estimated Effort:** Small

---

## Epic Description

Create the marketing landing page at kickoverlay.com that introduces the product and drives signups via Kick OAuth.

## Business Value

- First impression for potential users
- SEO entry point for organic discovery
- Clear value proposition and feature showcase
- Single CTA driving to OAuth signup

## Dependencies

- EPIC-3: Authentication (OAuth login button)

## Acceptance Criteria

1. Landing page at `/` (root route)
2. Hero section with value proposition
3. Feature highlights with visuals
4. Single prominent CTA: "Get Started Free with Kick"
5. Mobile responsive
6. Fast page load (< 2s)

---

## Stories

### Story 5.1: Landing Page Design & Implementation

**Story ID:** STORY-5.1
**Points:** 8
**Priority:** P1

#### Description
Create the landing page with hero section, features, and CTA.

#### Acceptance Criteria
- [ ] Hero section with headline, subheadline, CTA
- [ ] Feature cards (Overlays, Drop Game, TTS, Points)
- [ ] Screenshot/video showcase
- [ ] "Get Started Free with Kick" button
- [ ] Footer with links (privacy, terms, GitHub)
- [ ] Responsive design (mobile-first)
- [ ] Dark theme matching app

#### Technical Notes
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🎮 KickOverlay                                            [Login with Kick]│
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│              Professional Stream Overlays                                    │
│              for Kick.com Streamers                                          │
│                                                                              │
│              [Hero image/video preview]                                      │
│                                                                              │
│              ┌────────────────────────────────────┐                         │
│              │  🟢 Get Started Free with Kick     │                         │
│              └────────────────────────────────────┘                         │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  🎨 Custom   │  │  🎮 Drop     │  │  🔊 TTS      │  │  💰 Points   │    │
│  │  Overlays    │  │  Game        │  │  Integration │  │  System      │    │
│  │              │  │              │  │              │  │              │    │
│  │  Drag-drop   │  │  Physics     │  │  100+        │  │  Engage      │    │
│  │  widgets     │  │  fun         │  │  voices      │  │  viewers     │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  © 2024 KickOverlay | Privacy | Terms | GitHub                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Files to Create
- `src/pages/LandingPage.tsx`
- `src/components/landing/Hero.tsx`
- `src/components/landing/FeatureCard.tsx`
- `src/components/landing/Footer.tsx`

---

### Story 5.2: SEO & Meta Tags

**Story ID:** STORY-5.2
**Points:** 3
**Priority:** P2

#### Description
Add proper meta tags for SEO and social sharing.

#### Acceptance Criteria
- [ ] Title tag: "KickOverlay - Professional Stream Overlays for Kick.com"
- [ ] Meta description
- [ ] Open Graph tags (og:title, og:description, og:image)
- [ ] Twitter Card tags
- [ ] Canonical URL
- [ ] Favicon and app icons

#### Technical Notes
```html
<head>
  <title>KickOverlay - Professional Stream Overlays for Kick.com</title>
  <meta name="description" content="Free overlay system with drop game, TTS, and points economy for Kick streamers." />
  <meta property="og:title" content="KickOverlay" />
  <meta property="og:description" content="Professional stream overlays for Kick.com" />
  <meta property="og:image" content="/og-image.png" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
</head>
```

#### Files to Modify
- `index.html`

---

### Story 5.3: Domain Configuration

**Story ID:** STORY-5.3
**Points:** 2
**Priority:** P2

#### Description
Configure domain routing for marketing vs app.

#### Acceptance Criteria
- [ ] `kickoverlay.com` → marketing landing
- [ ] `system.kickoverlay.com` → application
- [ ] SSL certificates configured
- [ ] Redirect www to non-www
- [ ] Document DNS setup

#### Technical Notes
This may be handled at infrastructure level (nginx/cloudflare) rather than application code.

#### Files to Create
- `docs/deployment.md` (DNS section)

---

## Definition of Done

- [ ] All stories completed and merged
- [ ] Landing page accessible at root
- [ ] CTA leads to OAuth flow
- [ ] Mobile responsive
- [ ] Page loads < 2s
- [ ] SEO meta tags in place
