import { useCallback, useEffect, useRef } from "preact/hooks";
import { marked } from "marked";
import hljs from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import xml from "highlight.js/lib/languages/xml";
import python from "highlight.js/lib/languages/python";
import yaml from "highlight.js/lib/languages/yaml";
import diff from "highlight.js/lib/languages/diff";
import markdown from "highlight.js/lib/languages/markdown";
import "highlight.js/styles/github-dark.min.css";

hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("ts", typescript);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("js", javascript);
hljs.registerLanguage("json", json);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("sh", bash);
hljs.registerLanguage("css", css);
hljs.registerLanguage("html", xml);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("python", python);
hljs.registerLanguage("yaml", yaml);
hljs.registerLanguage("yml", yaml);
hljs.registerLanguage("diff", diff);
hljs.registerLanguage("markdown", markdown);
hljs.registerLanguage("md", markdown);

marked.setOptions({ breaks: true, gfm: true });

export function useMarkdownRenderer() {
  const containerRef = useRef<HTMLDivElement>(null);

  const render = useCallback((markdownContent: string) => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = marked.parse(markdownContent) as string;
    containerRef.current
      .querySelectorAll("pre code")
      .forEach((block) => hljs.highlightElement(block as HTMLElement));
  }, []);

  return { containerRef, render };
}

export function MarkdownBody({ content }: { content: string }) {
  const { containerRef, render } = useMarkdownRenderer();

  useEffect(() => {
    render(content);
  }, [content, render]);

  return (
    <div
      ref={containerRef}
      class="md-body text-[0.92rem] leading-[1.75]"
    />
  );
}
