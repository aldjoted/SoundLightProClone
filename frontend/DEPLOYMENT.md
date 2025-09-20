# Production Deployment Guide

## Prerequisites

1. **Node.js 18+** installed
2. **Production environment variables** configured
3. **Domain and SSL certificate** ready
4. **CDN** configured (optional but recommended)

## Build Process

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.production` and update values:
```bash
cp .env.example .env.production
```

Update the following variables:
- `VITE_API_BASE_URL`: Your production API URL
- `VITE_SITE_URL`: Your production domain
- `VITE_GOOGLE_ANALYTICS_ID`: Your GA4 measurement ID
- `VITE_SENTRY_DSN`: Your Sentry DSN for error tracking

### 3. Build for Production
```bash
npm run build
```

This will create a `dist/` folder with optimized assets.

### 4. Preview Build (Optional)
```bash
npm run preview
```

## Server Configuration

### Apache (.htaccess)
```apache
# Enable compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>

# Cache static assets
<IfModule mod_expires.c>
    ExpiresActive on
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
    ExpiresByType font/woff2 "access plus 1 year"
</IfModule>

# Security headers
<IfModule mod_headers.c>
    Header always set X-Content-Type-Options nosniff
    Header always set X-Frame-Options DENY
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"
    
    # HSTS (use only if you have HTTPS)
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
</IfModule>

# SPA fallback
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    RewriteRule ^index\.html$ - [L]
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /index.html [L]
</IfModule>
```

### Nginx
```nginx
server {
    listen 443 ssl http2;
    server_name soundlightpro.com www.soundlightpro.com;
    
    root /var/www/soundlightpro/dist;
    index index.html;
    
    # SSL configuration
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload";
    
    # Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
    
    # Cache static assets
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API proxy (if needed)
    location /api/ {
        proxy_pass http://your-backend-server;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name soundlightpro.com www.soundlightpro.com;
    return 301 https://$server_name$request_uri;
}
```

## CDN Configuration

### Cloudflare Settings
1. **Caching Level**: Standard
2. **Browser Cache TTL**: 1 year for static assets
3. **Minification**: Auto-minify HTML, CSS, JS
4. **Compression**: Enable Brotli
5. **Security**: Enable WAF, DDoS protection

### Performance Optimizations
- Enable HTTP/2
- Use WebP images where supported
- Implement proper cache headers
- Consider using a CDN for static assets

## Monitoring Setup

### 1. Google Analytics
- Create GA4 property
- Add tracking ID to environment variables
- Verify tracking is working

### 2. Error Tracking (Sentry)
- Create Sentry project
- Add DSN to environment variables
- Test error reporting

### 3. Performance Monitoring
- Set up Core Web Vitals monitoring
- Monitor bundle sizes
- Track loading performance

## Security Checklist

- [ ] HTTPS enabled with valid SSL certificate
- [ ] Security headers configured
- [ ] Content Security Policy implemented
- [ ] Input validation in place
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Dependencies audited (`npm audit`)

## Launch Checklist

- [ ] Environment variables configured
- [ ] Build process tested
- [ ] All pages accessible
- [ ] Forms working correctly
- [ ] Analytics tracking verified
- [ ] Error tracking tested
- [ ] Performance metrics acceptable
- [ ] Security headers verified
- [ ] SEO meta tags in place
- [ ] Mobile responsiveness tested
- [ ] Cross-browser compatibility verified

## Post-Launch Monitoring

1. **Performance**: Monitor Core Web Vitals
2. **Errors**: Check Sentry for any issues
3. **Analytics**: Verify user tracking
4. **Uptime**: Set up monitoring alerts
5. **Security**: Regular security scans

## Maintenance

- Regular dependency updates (`npm update`)
- Security audits (`npm audit`)
- Performance monitoring
- Content updates
- Backup strategies

## Rollback Strategy

1. Keep previous build in separate directory
2. Test new builds in staging environment
3. Have rollback script ready
4. Monitor key metrics after deployment