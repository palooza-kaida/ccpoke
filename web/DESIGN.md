# ccpoke Design System

## Philosophy
- **Minimal & Clean**: White background, generous whitespace, no visual clutter
- **Developer-oriented**: Terminal aesthetic mixed with modern web design
- **Warm accent**: Orange-terracotta accent color creates warmth against neutral palette
- **Typography-first**: Content hierarchy driven by type scale, not decorative elements

## Color Palette

### Core
| Token             | Hex       | Usage                          |
|-------------------|-----------|--------------------------------|
| `bg`              | `#FFFFFF` | Page background                |
| `bg-warm`         | `#FAF9F7` | Section backgrounds, cards     |
| `bg-code`         | `#1A1A2E` | Terminal/code blocks           |
| `bg-code-2`       | `#222239` | Terminal header bar            |
| `txt`             | `#1A1A2E` | Headings, primary text         |
| `txt-2`           | `#5A5A72` | Body text, descriptions        |
| `txt-3`           | `#8E8E9F` | Muted text, labels             |

### Accent
| Token             | Hex       | Usage                          |
|-------------------|-----------|--------------------------------|
| `accent`          | `#D97757` | Links, highlights, CTA         |
| `accent-hover`    | `#C4623F` | Hover state                    |
| `accent-light`    | `#FFF0EB` | Accent background, badges      |

### Semantic
| Token             | Hex       | Usage                          |
|-------------------|-----------|--------------------------------|
| `emerald`         | `#2E8B57` | Success, completed items       |
| `emerald-light`   | `#E8F5EE` | Success background             |
| `sky`             | `#4A7FD4` | Info, links                    |
| `sky-light`       | `#EBF2FC` | Info background                |
| `plum`            | `#7C5CBF` | Secondary accent               |
| `plum-light`      | `#F1ECF9` | Secondary accent background    |

### Terminal
| Token             | Hex       | Usage                          |
|-------------------|-----------|--------------------------------|
| `term-text`       | `#E0E0E0` | Terminal text                  |
| `term-sub`        | `#B0B0C0` | Terminal secondary             |
| `term-comment`    | `#606078` | Code comments                  |
| `term-muted`      | `#666666` | Inactive tab                   |
| `term-dim`        | `#999999` | Buttons                        |

### UI Elements
| Token             | Hex       | Usage                          |
|-------------------|-----------|--------------------------------|
| `border`          | `#EBEBEB` | Borders, dividers              |
| `feat-icon`       | `#F0F0F2` | Feature icon background        |
| `plat-more`       | `#F5F5F5` | Platform badge neutral         |

## Typography

### Fonts
- **Sans**: `Inter` (400, 500, 600, 700, 800) — body, headings, UI
- **Mono**: `JetBrains Mono` (400, 500) — code, terminal

### Scale
| Element            | Size               | Weight | Tracking |
|--------------------|--------------------| -------|----------|
| Hero title         | `clamp(2.2rem, 5.5vw, 3.4rem)` | 800 | `-0.04em` |
| Section title      | `clamp(1.5rem, 3vw, 2rem)` | 700 | `tight` |
| Section label      | `0.72rem`          | 700    | `0.14em` uppercase |
| Body               | `0.95rem`          | 400    | normal |
| Small/tags         | `0.78rem`          | 500-600| normal |
| Code               | `0.78-0.88rem`     | 400    | normal |

## Layout

- **Max width**: `880px` (content), `780px` (response viewer)
- **Padding**: `px-6` (24px horizontal)
- **Section spacing**: `py-20` (80px vertical)
- **Border radius**: `rounded-xl` (cards), `rounded-2xl` (sections), `rounded-full` (tags)

## Component Patterns

### Navbar
- Sticky, `backdrop-blur-[12px]`, `bg-white/85`
- Height: `h-14`
- Logo (32x32) + nav links + language picker + GitHub icon + mobile menu

### Section
- Label (uppercase, accent color) → Title (bold) → Description (muted) → Content

### Feature Item
- Grid: `48px icon | content`
- Icon: rounded-xl, colored background
- Separated by `border-b border-border`

### Timeline/Roadmap
- Left-aligned dots with gradient line
- Dot states: `done` (emerald), `wip` (accent), `soon` (border)
- Tags: `rounded-full`, colored by phase status

### Terminal Block
- Dark background (`bg-code`)
- Header with traffic light dots + package manager tabs
- Content with `$` prompt prefix

### CTA Section
- Warm background (`bg-warm`), centered
- GitHub button: dark background, white text

## Platform Badges
- Telegram: `bg-[#E3F2FD] text-[#1976D2]`
- Discord: `bg-[#EDE7F6] text-[#5E35B1]`
- Zalo: `bg-[#E8F5E9] text-[#2E7D32]`

## Responsive
- Breakpoint: `700px`
- Mobile: single column, smaller fonts, collapsed nav
- Timeline adjusts padding/dot size
- Terminal wraps text

## Animations
- Transitions: `0.15s` (default), `0.2s` (hover)
- Tag hover: `translateY(-1px)` + shadow
- Language dropdown: fade + translate
- No complex animations — prefers simplicity
