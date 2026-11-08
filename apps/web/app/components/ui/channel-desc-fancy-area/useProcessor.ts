import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import type { VNodeChild } from 'vue';
import Mention from './Mention.vue';

// markdown (+ @mentions) -> sanitized HAST -> Vue vnodes. The old version used rehype-react; rendering vnodes
// (instead of a v-html string) keeps the <mention> hover cards as real components, and the tree is the
// output of rehype-sanitize so no raw HTML ever reaches the DOM.
// minimal HAST shapes (@types/hast is not a direct dependency)
type HastText = { type: 'text'; value: string };
type HastElement = {
  type: 'element';
  tagName: string;
  properties?: Record<string, unknown>;
  children: RootContent[];
};
type RootContent = HastText | HastElement | { type: string };
type Root = { type: 'root'; children: RootContent[] };

const mentionRegex = /@(\w+)/g;

const processor = unified()
  .use(remarkParse)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeSanitize, {
    ...defaultSchema,
    tagNames: [...defaultSchema.tagNames!, 'mention'],
    attributes: {
      ...defaultSchema.attributes,
      mention: ['handle'],
    },
  });

export function processMarkdown(md: string): Root {
  const text = md.replace(mentionRegex, '<mention handle="$1">@$1</mention>');
  return processor.runSync(processor.parse(text), text) as Root;
}

type MentionChannels = StreamInfoResponse;

export function renderHast(tree: Root, channels: MentionChannels): VNodeChild {
  const renderNode = (node: RootContent, key: number): VNodeChild => {
    if (node.type === 'text') return (node as HastText).value;
    if (node.type !== 'element') return null;
    return renderElement(node as HastElement, key);
  };

  const renderElement = (node: HastElement, key: number): VNodeChild => {
    const children = node.children.map((child, i) => renderNode(child, i));
    const props: Record<string, unknown> = { key };
    for (const [name, value] of Object.entries(node.properties ?? {})) {
      if (value === undefined || value === null || value === false) continue;
      if (name === 'className') props.class = Array.isArray(value) ? value.join(' ') : value;
      else props[name] = Array.isArray(value) ? value.join(' ') : value;
    }

    if (node.tagName === 'mention') {
      return h(Mention, { handle: String(props.handle ?? ''), channels, key }, () => children);
    }
    return h(node.tagName, props, children);
  };

  return tree.children.map((child, i) => renderNode(child, i));
}
