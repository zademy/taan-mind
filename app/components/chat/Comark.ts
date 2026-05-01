/**
 * Comark component configuration for rendering rich chat content.
 *
 * Uses Comark's Shiki highlighter without static language imports.
 * The highlighter is only created when a rendered message contains code blocks,
 * and Comark's default language set is loaded dynamically by the plugin.
 */
import highlight from '@comark/nuxt/plugins/highlight'
/** Custom source-link component used within rendered markdown content */
import _SourceLink from './SourceLink.vue'

export default defineComarkComponent({
  name: 'ChatComark',
  plugins: [
    highlight()
  ],
  // Custom component mappings used within rendered markdown content
  components: {
    'source-link': _SourceLink
  },
  // Tailwind classes applied to the root element (removes margin from first/last children)
  class: 'first:mt-0 last:mb-0'
})
