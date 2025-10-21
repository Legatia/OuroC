# OuroC Landing Page

A professional, modern landing page for OuroC - the decentralized subscription payment protocol.

## Overview

This is a standalone website that introduces OuroC to potential users and developers. It showcases the key features, architecture, and provides quick access to all important resources.

## Features

- **Modern Design**: Clean, professional layout with Tailwind CSS
- **Responsive**: Works perfectly on desktop, tablet, and mobile devices
- **Interactive Elements**: Smooth animations, hover effects, and transitions
- **Call-to-Action**: Clear buttons linking to GitHub, NPM, documentation, and dashboard
- **Hero Section**: Eye-catching gradient background with floating logo animation
- **Feature Showcase**: Detailed presentation of AI-to-agent payments, email signup, and enterprise privacy
- **Architecture Diagram**: Visual explanation of the minimalist 600-line ICP timer approach
- **Developer Resources**: Quick integration guide with code examples
- **Community Links**: Easy access to Discord, Twitter, and other platforms

## Tech Stack

- **HTML5**: Semantic markup structure
- **Tailwind CSS**: Utility-first CSS framework (via CDN)
- **Font Awesome**: Icon library for social links and UI elements
- **Vanilla JavaScript**: Interactive functionality (no heavy frameworks needed)
- **Google Fonts**: Inter font for modern typography

## File Structure

```
website/
├── index.html          # Main landing page
├── ouroc-logo.jpeg     # Company logo
├── README.md          # This file
└── docs/              # (future) Additional documentation
```

## Key Sections

1. **Navigation**: Sticky header with smooth scroll navigation
2. **Hero**: Main value proposition with call-to-action buttons
3. **Features**: Three-column layout showcasing core capabilities
4. **Architecture**: Visual diagram of the tech stack
5. **Developers**: Integration guide with code examples
6. **Resources**: Links to documentation, SDK, and community
7. **Footer**: Comprehensive footer with all important links

## Customization

### Updating Links
Replace placeholder URLs with actual links:
- GitHub: `https://github.com/ouroc`
- Documentation: `https://docs.ouroc.com`
- NPM: `https://www.npmjs.com/package/@ouroc/sdk`
- Dashboard: `https://dashboard.ouroc.com`
- Discord: `https://discord.gg/ouroc`

### Brand Colors
The primary color scheme uses purple variants. To customize:
- Update Tailwind CSS color classes (purple-600, purple-700, etc.)
- Modify gradient backgrounds in `<style>` section
- Adjust hover states and transitions

### Content Updates
- Update hero section headline and description
- Modify feature cards with latest capabilities
- Update architecture diagram if changes are made
- Refresh developer integration steps

## Deployment

### Static Hosting
This is a pure static website and can be deployed on any static hosting service:

**Netlify:**
1. Connect your GitHub repository
2. Set build command: `echo "No build needed"`
3. Set publish directory: `website`
4. Deploy automatically on push to main branch

**Vercel:**
1. Import project from GitHub
2. Set framework preset: "Other"
3. Set build settings: No build command needed
4. Set output directory: `website`

**GitHub Pages:**
1. Enable GitHub Pages in repository settings
2. Select source: Deploy from a branch
3. Choose branch: `main` and folder: `/website`
4. Site will be available at `https://username.github.io/repo-name`

**Custom Domain:**
Simply point your domain's DNS to the hosting provider and add the domain in the hosting settings.

### Local Development
Since this is a static HTML file, you can simply:
1. Open `index.html` in a web browser
2. Or use a simple local server:
   ```bash
   # Python 3
   python -m http.server 8000

   # Node.js (if you have http-server installed)
   npx http-server
   ```

## Browser Support

- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance

- **Lightweight**: Single HTML file under 50KB
- **CDN Resources**: Tailwind CSS and Font Awesome loaded from fast CDNs
- **Optimized Images**: Logo compressed and appropriately sized
- **Minimal JavaScript**: Only essential interactions, no heavy frameworks
- **SEO Optimized**: Proper meta tags and semantic HTML structure

## Analytics

To add analytics, simply add the tracking script before the closing `</head>` tag:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_TRACKING_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_TRACKING_ID');
</script>
```

## Contributing

When making changes:
1. Keep the design consistent with existing style
2. Test responsiveness on different screen sizes
3. Ensure all links open in appropriate windows (external links in new tabs)
4. Maintain semantic HTML structure
5. Test cross-browser compatibility

## License

This landing page is part of the OuroC project and follows the same MIT license as the main repository.