# 🏆 Hybrid Award Discovery System

## Overview

A comprehensive, multi-layered system for discovering and managing player awards that combines web scraping, AI validation, and manual curation for maximum accuracy and reliability.

## 🎯 Why This Approach?

The previous AI-only approach had fundamental limitations:
- **Inconsistent Results**: AI couldn't reliably browse the web or access real-time data
- **Poor Source URLs**: Generated fake or broken links
- **Inaccurate Names**: Often swapped award names with descriptions
- **Limited Coverage**: Missed many legitimate awards

## 🏗️ System Architecture

### **1. Multi-Source Data Pipeline**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Team Sites    │    │  College Sites  │    │ Sports Databases│
│  (Official)     │    │  (Official)     │    │ (ESPN, SR, etc) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  AI Validation  │
                    │  & Deduplication│
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │ Manual Curation│
                    │   (Admin UI)    │
                    └─────────────────┘
```

### **2. Data Sources**

#### **A. Official Team Websites**
- **Indianapolis Colts**: `https://www.colts.com`
- **San Diego/Los Angeles Chargers**: `https://www.chargers.com`
- **Other NFL Teams**: Expandable list
- **Scraping Strategy**: Search for player, find awards/honors sections

#### **B. College Athletics Sites**
- **UC Berkeley**: `https://calbears.com`
- **Other Pac-12 Schools**: Expandable list
- **Scraping Strategy**: Look for all-conference, all-american, academic honors

#### **C. Sports Databases**
- **Sports Reference**: `https://www.sports-reference.com`
- **ESPN API**: If available
- **NCAA Database**: Official records

### **3. AI Validation Layer**

```typescript
// Validates and cleans scraped data
async function validateAndDeduplicateAwards(
  awards: AwardSource[], 
  playerName: string
): Promise<AwardSource[]> {
  // 1. Verify it's actually an award (not just a statistic)
  // 2. Ensure name is concise (2-8 words)
  // 3. Ensure description explains when/why won
  // 4. Remove duplicates (same award, same year)
  // 5. Set confidence based on source reliability
  // 6. Mark as verified if from official sources
}
```

### **4. Manual Curation Interface**

#### **Admin Features:**
- **Review Pending Awards**: See all discovered awards needing verification
- **Edit Award Details**: Fix names, descriptions, years, organizations
- **Verify/Unverify**: Mark awards as verified by admin
- **Delete Invalid Awards**: Remove false positives
- **Bulk Operations**: Verify multiple awards at once

#### **UI Components:**
- **Player Selection**: Choose which player to review
- **Award Cards**: Display award details with edit capabilities
- **Verification Status**: Visual indicators for verified vs pending
- **Source Links**: Direct links to verify information

## 🚀 Implementation

### **1. Core Files Created:**

#### **Hybrid Discovery System**
- `lib/awards/hybrid-discovery.ts` - Main orchestration
- `lib/awards/web-scraper.ts` - Puppeteer-based scraping
- `app/api/awards/discover-hybrid/route.ts` - New API endpoint

#### **Admin Curation Interface**
- `app/admin/awards/curation/page.tsx` - Main curation page
- `app/admin/awards/curation/curation-client.tsx` - React components
- `app/api/admin/awards/pending/route.ts` - Get pending awards
- `app/api/admin/awards/[id]/route.ts` - Update/delete awards
- `app/api/admin/awards/[id]/verify/route.ts` - Verify awards

### **2. Database Schema**

```sql
-- Player Awards Table
CREATE TABLE player_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id),
  name TEXT NOT NULL,
  description TEXT,
  year INTEGER,
  organization TEXT,
  category TEXT CHECK (category IN ('sports', 'academic', 'personal')),
  significance TEXT CHECK (significance IN ('local', 'conference', 'national', 'professional')),
  source_url TEXT,
  image_url TEXT,
  confidence DECIMAL(3,2) DEFAULT 0.5,
  verified BOOLEAN DEFAULT FALSE,
  needs_review BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_player_awards_player_id ON player_awards(player_id);
CREATE INDEX idx_player_awards_verified ON player_awards(verified);
CREATE INDEX idx_player_awards_needs_review ON player_awards(needs_review);
```

### **3. Usage Flow**

#### **For Players:**
1. Click "Discover My Awards" button
2. System scrapes official websites
3. AI validates and deduplicates results
4. Awards appear in dock (pending verification)
5. Admin reviews and verifies awards
6. Verified awards show with full confidence

#### **For Admins:**
1. Navigate to `/admin/awards/curation`
2. Select player to review
3. Review discovered awards
4. Edit details if needed
5. Verify legitimate awards
6. Delete false positives

## 🔧 Configuration

### **Environment Variables**
```bash
# Required for web scraping
PUPPETEER_EXECUTABLE_PATH=/path/to/chrome

# OpenAI for validation
OPENAI_API_KEY=your_key_here

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_key
```

### **Team/College URLs**
Add new teams and colleges in:
- `lib/awards/web-scraper.ts` - `getTeamUrl()` and `getCollegeUrl()`

## 📊 Quality Metrics

### **Confidence Scoring**
- **Official Team Sites**: 0.9-1.0
- **Official College Sites**: 0.85-0.95
- **Sports Databases**: 0.7-0.9
- **AI-Generated**: 0.5-0.8

### **Verification Process**
1. **Auto-Verification**: Official sources marked as verified
2. **Admin Review**: Manual verification for uncertain sources
3. **Community Feedback**: Future feature for player input

## 🎯 Benefits

### **Reliability**
- **Real Data**: Scraped from official sources
- **Verifiable**: Direct links to source material
- **Accurate**: AI validation + human review

### **Completeness**
- **Multiple Sources**: Team, college, and database coverage
- **Comprehensive**: Academic, athletic, and personal awards
- **Historical**: Can find awards from any year

### **Scalability**
- **Automated**: Minimal manual work required
- **Extensible**: Easy to add new sources
- **Maintainable**: Clear separation of concerns

## 🚀 Next Steps

### **Phase 1: Basic Implementation**
- [x] Hybrid discovery system
- [x] Web scraping with Puppeteer
- [x] AI validation layer
- [x] Admin curation interface

### **Phase 2: Enhanced Features**
- [ ] Real-time scraping updates
- [ ] Image generation for missing awards
- [ ] Bulk import from CSV
- [ ] Export functionality

### **Phase 3: Advanced Features**
- [ ] Community verification
- [ ] Award comparison tools
- [ ] Historical trend analysis
- [ ] Integration with other sports APIs

## 🔍 Testing

### **Test Scripts**
- `scripts/test-hybrid-discovery.js` - Test the full pipeline
- `scripts/test-web-scraper.js` - Test scraping functionality
- `scripts/test-admin-api.js` - Test curation APIs

### **Manual Testing**
1. Run hybrid discovery for a test player
2. Check admin interface for pending awards
3. Verify/edit awards in the UI
4. Confirm changes are saved correctly

## 📈 Performance Considerations

### **Scraping Optimization**
- **Rate Limiting**: Respect website rate limits
- **Caching**: Cache results to avoid re-scraping
- **Parallel Processing**: Scrape multiple sources simultaneously
- **Error Handling**: Graceful failure for unavailable sources

### **Database Optimization**
- **Indexing**: Proper indexes for common queries
- **Pagination**: Handle large result sets
- **Cleanup**: Remove old, invalid awards

## 🛡️ Security & Compliance

### **Web Scraping Ethics**
- **Respect robots.txt**: Check before scraping
- **Rate Limiting**: Don't overload servers
- **Terms of Service**: Comply with website ToS
- **Data Usage**: Only use for legitimate purposes

### **Data Privacy**
- **Player Consent**: Only scrape public information
- **Data Retention**: Clear policies for award data
- **GDPR Compliance**: Handle EU player data properly

---

This hybrid system provides a much more reliable and comprehensive solution for award discovery while maintaining the flexibility to adapt to new sources and requirements.
