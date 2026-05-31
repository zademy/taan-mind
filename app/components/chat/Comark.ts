/**
 * Comark.ts — Chat markdown renderer configuration
 *
 * Wraps the NuxtUI Comark plugin to render AI assistant markdown with:
 *   - Shiki syntax highlighting (dynamic, no static language imports)
 *   - Custom source-link component injection via MDC (Markdown Components)
 *   - Tailwind resets on first/last child margins
 *
 * Used as `<ChatComark :markdown="..." :streaming="..." />` in message rendering.
 * The component's `plugins` and `components` are merged at registration time;
 * `highlight()` is called here so the instance is shared across renders.
 *
 * Related:
 *   app/components/chat/message/MessageContent.vue — renders ChatComark for
 *     assistant text parts with streaming prop support
 *   app/components/chat/SourceLink.vue — custom MDC component for external links
 */
import highlight from '@comark/nuxt/plugins/highlight'
/** Custom source-link component used within rendered markdown content */
import _SourceLink from './SourceLink.vue'

export default defineComarkComponent({
  name: 'ChatComark',
  plugins: [highlight()],
  // Custom component mappings used within rendered markdown content
  components: {
    'source-link': _SourceLink
  },
  // Tailwind classes applied to the root element (removes margin from first/last children)
  class: 'first:mt-0 last:mb-0'
})
