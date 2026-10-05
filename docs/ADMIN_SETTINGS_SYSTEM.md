# Admin Settings System Documentation

## Overview

The BLTZ Admin Settings System provides comprehensive configuration management for the platform. It includes 7 main settings categories with full database integration and real-time updates.

## 🏗️ Architecture

### Database Schema
- **7 Settings Tables**: Each category has its own dedicated table
- **Row Level Security (RLS)**: Admin-only access to all settings
- **Audit Trail**: Created/updated timestamps for all changes
- **Default Values**: Sensible defaults for all settings

### API Structure
- **RESTful Endpoints**: `/api/admin/settings/{category}`
- **CRUD Operations**: GET (fetch) and PUT (update) for each category
- **Authentication**: Admin role required for all operations
- **Error Handling**: Comprehensive error responses

### Frontend Components
- **Tabbed Interface**: 7 main settings sections
- **Real-time Updates**: Live form state management
- **Loading States**: User feedback during operations
- **Error Handling**: Clear error messages and recovery

## 📊 Settings Categories

### 1. Site Configuration (`/admin/settings/site`)
**Purpose**: Basic platform settings and branding
- Site name, description, URL
- Maintenance mode toggle
- Registration controls
- File upload limits
- Localization settings

**Database Table**: `site_configuration`
**API Endpoint**: `/api/admin/settings/site`

### 2. User Management (`/admin/settings/users`)
**Purpose**: User registration and profile settings
- Email verification requirements
- Username and password policies
- Session management
- Two-factor authentication
- Profile customization options

**Database Table**: `user_management_settings`
**API Endpoint**: `/api/admin/settings/users`

### 3. Content Moderation (`/admin/settings/moderation`)
**Purpose**: Content filtering and moderation policies
- Auto-moderation settings
- Report thresholds
- User approval workflows
- Escalation processes
- Appeal systems

**Database Table**: `content_moderation_settings`
**API Endpoint**: `/api/admin/settings/moderation`

### 4. Email & Notifications (`/admin/settings/email`)
**Purpose**: Communication and notification settings
- SMTP configuration
- Email templates
- Notification preferences
- Marketing email controls
- System alerts

**Database Table**: `email_notification_settings`
**API Endpoint**: `/api/admin/settings/email`

### 5. Security Settings (`/admin/settings/security`)
**Purpose**: Platform security and access control
- Authentication policies
- Password requirements
- IP whitelisting
- Rate limiting
- CORS configuration
- API security

**Database Table**: `security_settings`
**API Endpoint**: `/api/admin/settings/security`

### 6. System Settings (`/admin/settings/system`)
**Purpose**: Technical platform configuration
- Maintenance mode
- Cache settings
- Database configuration
- Backup management
- Monitoring controls
- Performance optimization

**Database Table**: `system_settings`
**API Endpoint**: `/api/admin/settings/system`

### 7. Integration Settings (`/admin/settings/integrations`)
**Purpose**: Third-party service integrations
- Social media APIs
- Payment processors
- Analytics services
- Communication tools
- Storage providers
- AI/ML services

**Database Table**: `integration_settings`
**API Endpoint**: `/api/admin/settings/integrations`

## 🚀 Setup Instructions

### 1. Database Setup
```bash
# Run the SQL setup script
psql $SUPABASE_URL -f scripts/setup-settings.sql

# Or use the provided shell script
./scripts/setup-settings.sh
```

### 2. Environment Variables
Ensure these are set in your `.env.local`:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Admin Access
Only users with `role = 'admin'` in the `profiles` table can access settings.

## 🔧 Usage

### Accessing Settings
1. Navigate to `/admin/settings`
2. Select the desired settings category
3. Modify settings as needed
4. Click "Save" to persist changes

### API Usage
```typescript
// Fetch settings
const response = await fetch('/api/admin/settings/site');
const settings = await response.json();

// Update settings
const response = await fetch('/api/admin/settings/site', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(updatedSettings)
});
```

### Using the Hook
```typescript
import { useSettings } from '@/hooks/useSettings';

const { settings, setSettings, loading, saving, error, saveSettings } = useSettings({
  endpoint: 'site',
  initialData: defaultSiteSettings
});
```

## 🛡️ Security Features

### Row Level Security (RLS)
- All settings tables have RLS enabled
- Only admin users can read/write settings
- Policies check user role before allowing access

### API Security
- Admin role verification on all endpoints
- Input validation and sanitization
- Error handling without data exposure

### Frontend Security
- Client-side validation
- Secure form handling
- Error boundary protection

## 📱 Responsive Design

### Mobile Optimization
- 2x2 grid layout on mobile devices
- Compact form controls
- Touch-friendly interfaces
- Optimized text sizes

### Tablet Support
- Responsive breakpoints
- Adaptive layouts
- Touch interactions

### Desktop Experience
- Full feature access
- Keyboard navigation
- Advanced form controls

## 🔄 Real-time Updates

### State Management
- Local React state for form data
- Optimistic updates for better UX
- Rollback on API failures
- Loading and error states

### Data Synchronization
- Automatic refresh on component mount
- Manual refresh capabilities
- Conflict resolution
- Change tracking

## 🧪 Testing

### Unit Tests
- Component rendering tests
- Hook functionality tests
- API endpoint tests
- Error handling tests

### Integration Tests
- End-to-end settings flow
- Database integration tests
- Authentication tests
- Permission tests

## 📈 Performance

### Optimization Features
- Lazy loading of settings components
- Efficient state management
- Minimal re-renders
- Optimized API calls

### Caching Strategy
- Client-side caching of settings
- Server-side caching of database queries
- Cache invalidation on updates

## 🐛 Troubleshooting

### Common Issues

1. **Settings not loading**
   - Check admin permissions
   - Verify database connection
   - Check console for errors

2. **Settings not saving**
   - Verify API endpoint accessibility
   - Check network connectivity
   - Review error messages

3. **Permission denied**
   - Ensure user has admin role
   - Check RLS policies
   - Verify authentication

### Debug Mode
Enable debug logging by setting `debugMode: true` in system settings.

## 🔮 Future Enhancements

### Planned Features
- Settings versioning and history
- Bulk settings import/export
- Settings templates
- Advanced validation rules
- Real-time collaboration
- Settings analytics

### Integration Opportunities
- Webhook notifications on changes
- External configuration management
- Multi-environment support
- Settings backup/restore

## 📚 API Reference

### Endpoints
- `GET /api/admin/settings/{category}` - Fetch settings
- `PUT /api/admin/settings/{category}` - Update settings

### Response Format
```json
{
  "setting_name": "value",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### Error Format
```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## 🤝 Contributing

### Development Guidelines
1. Follow existing code patterns
2. Add comprehensive tests
3. Update documentation
4. Ensure responsive design
5. Test across all devices

### Code Style
- TypeScript for type safety
- Consistent naming conventions
- Proper error handling
- Clean component structure

---

This settings system provides a robust foundation for platform configuration management with room for future expansion and enhancement.
