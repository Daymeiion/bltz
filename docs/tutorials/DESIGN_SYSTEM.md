# bltz Design System

## Overview
The bltz dashboard features a premium, athletic-inspired design system that combines bold typography, dynamic gradients, and a carefully crafted color palette inspired by Nike and Gatorade's sports aesthetics.

## Brand Colors

### Primary - Blues
Our primary brand colors use electric blues that convey energy, performance, and trust.

- **Navy** (`--bltz-navy`): `hsl(0, 25%, 15%)` - Deep navy for dark backgrounds
- **Blue** (`--bltz-blue`): `hsl(217, 91%, 60%)` - Primary electric blue for CTAs and accents
- **Blue Light** (`--bltz-blue-light`): `hsl(217, 91%, 70%)` - Lighter blue for highlights
- **Blue Dark** (`--bltz-blue-dark`): `hsl(217, 91%, 45%)` - Darker blue for hover states

### Accent - Gold
Gold represents achievement, excellence, and premium quality.

- **Gold** (`--bltz-gold`): `hsl(45, 100%, 51%)` - Electric gold for secondary CTAs
- **Gold Light** (`--bltz-gold-light`): `hsl(45, 100%, 65%)` - Light gold for gradients
- **Gold Dark** (`--bltz-gold-dark`): `hsl(45, 100%, 40%)` - Dark gold for depth

### Neutrals
- **Black** (`--bltz-black`): `hsl(0, 0%, 8%)` - Almost black for backgrounds
- **Gray Dark** (`--bltz-gray-dark`): `hsl(220, 10%, 20%)` - Dark gray for cards
- **Gray** (`--bltz-gray`): `hsl(220, 10%, 50%)` - Mid gray for muted text
- **Gray Light** (`--bltz-gray-light`): `hsl(220, 10%, 90%)` - Light gray for subtle UI
- **White** (`--bltz-white`): `hsl(0, 0%, 98%)` - Off white for text

## Typography

### Font Weights
- **Black (900)**: Headlines and key numbers
- **Bold (700)**: Subheadings and important UI text
- **Semibold (600)**: Body emphasis
- **Medium (500)**: Default UI text

### Scale
- Headings: 2xl-5xl (font-black)
- Body: base-lg (font-medium to font-semibold)
- Labels: xs-sm (font-bold, uppercase, tracking-wider)

## Components

### Buttons

#### Primary Button (Blue)
```jsx
<button className="btn-primary">
  Action Text
</button>
```
- Background: Blue gradient
- Text: White
- Hover: Scale + shadow increase
- Use for: Primary actions, CTAs

#### Gold Button
```jsx
<button className="btn-gold">
  Action Text
</button>
```
- Background: Gold gradient
- Text: Black
- Hover: Scale + shadow increase
- Use for: Secondary actions, achievements

#### Outline Button
```jsx
<button className="px-6 py-3 border-2 border-bltz-gold/50 hover:border-bltz-gold hover:bg-bltz-gold/10 text-bltz-gold rounded-xl font-bold transition-all duration-300">
  Action Text
</button>
```
- Border: Gold with opacity
- Text: Gold
- Hover: Solid border + background glow
- Use for: Secondary actions, cancel buttons

### Cards

#### Glass Card (Standard)
```jsx
<div className="bg-black/60 backdrop-blur-md rounded-2xl border-2 border-bltz-blue/30 p-6 card-hover">
  {/* Content */}
</div>
```
Features:
- Semi-transparent black background
- Backdrop blur effect
- 2px border with brand color
- Hover: scale and shadow (via card-hover)

#### Stat Card (with Glow)
```jsx
<div className="relative group">
  <div className="absolute inset-0 bg-bltz-blue/30 blur-xl group-hover:blur-2xl transition-all rounded-2xl" />
  <div className="relative bg-black/60 backdrop-blur-md rounded-2xl border-2 border-bltz-blue/50 p-6 card-hover">
    {/* Content */}
  </div>
</div>
```
Features:
- Glowing background effect
- Enhanced on hover
- Perfect for stats and metrics

### Gradients

#### Blue Gradient
```css
.gradient-blue {
  background: linear-gradient(135deg, hsl(var(--bltz-blue)) 0%, hsl(var(--bltz-blue-dark)) 100%);
}
```

#### Gold Gradient
```css
.gradient-gold {
  background: linear-gradient(135deg, hsl(var(--bltz-gold-light)) 0%, hsl(var(--bltz-gold-dark)) 100%);
}
```

#### Blue-Gold Gradient
```css
.gradient-blue-gold {
  background: linear-gradient(135deg, hsl(var(--bltz-blue)) 0%, hsl(var(--bltz-gold)) 100%);
}
```

#### Text Gradient
```jsx
<span className="text-gradient-blue-gold">
  Gradient Text
</span>
```

## Layout Patterns

### Page Container
```jsx
<div className="min-h-screen bg-gradient-to-br from-bltz-navy via-bltz-black to-bltz-navy p-6 md:p-10">
  <div className="max-w-7xl mx-auto">
    {/* Page content */}
  </div>
</div>
```

### Page Header
```jsx
<div className="relative mb-10">
  {/* Decorative glow elements */}
  <div className="absolute -top-2 -left-2 w-64 h-64 bg-bltz-blue/10 rounded-full blur-3xl" />
  
  <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
    <div>
      <h1 className="text-4xl md:text-5xl font-black text-white mb-3 tracking-tight">
        Page <span className="text-gradient-blue-gold">Title</span>
      </h1>
      <p className="text-bltz-white/70 text-lg font-medium">
        Page description
      </p>
    </div>
    <div className="flex gap-3">
      {/* Action buttons */}
    </div>
  </div>
</div>
```

### Stat Grid
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {stats.map(stat => (
    <div className="relative group">
      <div className="absolute inset-0 bg-bltz-blue/30 blur-xl group-hover:blur-2xl transition-all rounded-2xl" />
      <div className="relative bg-black/60 backdrop-blur-md rounded-2xl border-2 border-bltz-blue/50 p-6 card-hover">
        {/* Stat content */}
      </div>
    </div>
  ))}
</div>
```

## Spacing & Sizing

### Padding Scale
- **Container**: `p-6 md:p-10` (24px / 40px)
- **Cards**: `p-6` to `p-8` (24px / 32px)
- **Buttons**: `px-6 py-3` (24px / 12px)
- **Small elements**: `p-4` (16px)

### Gap Scale
- **Large sections**: `gap-8` to `gap-10` (32px / 40px)
- **Card grids**: `gap-6` (24px)
- **Button groups**: `gap-3` (12px)
- **Inline elements**: `gap-2` (8px)

### Border Radius
- **Cards**: `rounded-2xl` (16px)
- **Buttons**: `rounded-xl` (12px)
- **Icons**: `rounded-lg` (8px)
- **Badges**: `rounded-full` (9999px)

## Effects & Transitions

### Hover Effects
```css
.card-hover {
  @apply transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl;
}
```

### Blur Effects
- Backdrop: `backdrop-blur-md` (12px)
- Glow elements: `blur-xl` to `blur-3xl` (24px / 64px)

### Transitions
- Standard: `transition-all duration-300`
- Buttons: `transition-all duration-300`
- Glow effects: `transition-opacity` or `transition-all`

## Best Practices

### DO ✅
- Use glass effects (backdrop-blur) for depth
- Apply glow effects to important elements
- Combine gradients with solid colors for variety
- Use uppercase, bold text for labels
- Add hover states to all interactive elements
- Maintain 2:1 contrast ratio for accessibility

### DON'T ❌
- Mix too many glow colors in one area
- Use pure black (#000000) - use bltz-black instead
- Forget hover/focus states on buttons
- Use thin font weights (under 500)
- Neglect mobile responsiveness
- Overuse gradients everywhere

## Dark Mode
The design is dark-first with no light mode variant. All colors are optimized for dark backgrounds with high contrast for readability.

## Accessibility
- All text meets WCAG AA standards (4.5:1 contrast)
- Interactive elements have clear focus states
- Gold accent provides strong contrast on dark backgrounds
- Blue primary color is distinguishable from gold

## Components List

### Existing Styled Components
- ✅ Dashboard (main page)
- ✅ StatsCards
- ✅ Videos Page
- ✅ Team Page
- ⏳ RecentVideos
- ⏳ ActivityFeed
- ⏳ PerformanceChart
- ⏳ VideoCard
- ⏳ Modals (InviteModal, AddTeammateModal)

## Usage Examples

### Creating a New Page
```jsx
export default function NewPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-bltz-navy via-bltz-black to-bltz-navy p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="relative mb-10">
          <h1 className="text-5xl font-black text-white">
            Page <span className="text-gradient-blue-gold">Title</span>
          </h1>
        </div>
        
        {/* Content */}
        <div className="bg-black/60 backdrop-blur-md rounded-2xl border-2 border-bltz-blue/30 p-8">
          {/* Your content */}
        </div>
      </div>
    </div>
  );
}
```

### Creating a Stat Card
```jsx
<div className="relative group">
  <div className="absolute inset-0 bg-bltz-blue/30 blur-xl group-hover:blur-2xl transition-all rounded-2xl" />
  <div className="relative bg-black/60 backdrop-blur-md rounded-2xl border-2 border-bltz-blue/50 p-6 card-hover">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-xs font-bold text-bltz-white/70 uppercase tracking-wider">
        Stat Label
      </h3>
      <Icon className="h-8 w-8 text-bltz-blue" />
    </div>
    <p className="text-4xl font-black text-white">123</p>
  </div>
</div>
```

## Future Enhancements
- Animation library integration (Framer Motion)
- Particle effects for backgrounds
- Advanced micro-interactions
- Custom loading states
- Progress indicators
- Toast notifications styling

