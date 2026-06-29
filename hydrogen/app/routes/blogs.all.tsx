import type { LoaderFunctionArgs, MetaFunction } from "@shopify/remix-oxygen";
import { useLoaderData, Link } from "react-router";
import { Calendar, ArrowRight } from "lucide-react";

export const meta: MetaFunction = () => [
  { title: "MLS Blog — Recipes, Tips & More" },
  { name: "description", content: "Explore MLS's latest recipes, meat tips, and brand ambassador stories." },
];

const ALL_BLOGS_QUERY = `#graphql
  query AllBlogs($language: LanguageCode)
  @inContext(language: $language) {
    blogs(first: 10) {
      nodes {
        handle
        title
        articles(first: 8, sortKey: PUBLISHED_AT, reverse: true) {
          nodes {
            handle title excerpt publishedAt tags
            author { name }
            image { url altText width height }
            blog { handle }
          }
        }
      }
    }
  }
` as const;

export async function loader({ context, request }: LoaderFunctionArgs) {
  const lang = request.headers.get("Cookie")?.match(/(?:^|;\s*)lang=([a-z]{2})/)?.[1];
  const language = (lang === "ar" ? "AR" : "EN") as "AR" | "EN";
  const { blogs } = await context.storefront.query(ALL_BLOGS_QUERY, {
    variables: { language },
  });
  const articles = (blogs?.nodes ?? [])
    .flatMap((b: any) => b.articles.nodes)
    .sort((a: any, b: any) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  return { articles };
}

export default function BlogsAll() {
  const { articles } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-10 md:py-14">
        <div className="mb-8 md:mb-10">
          <h1 className="font-display text-3xl font-extrabold text-foreground md:text-4xl">MLS Blog</h1>
          <p className="mt-2 text-sm text-muted-foreground">Recipes, tips, and stories from the MLS team.</p>
        </div>
        {articles.length === 0 ? (
          <p className="text-muted-foreground">No articles yet. Check back soon.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {articles.map((article: any) => (
              <ArticleCard key={article.handle + article.blog.handle} article={article} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ArticleCard({ article }: { article: any }) {
  const date = new Date(article.publishedAt).toLocaleDateString("en-AE", {
    day: "numeric", month: "short", year: "numeric",
  });

  return (
    <Link
      to={`/blogs/${article.blog.handle}/${article.handle}`}
      prefetch="intent"
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:border-crimson/40 hover:shadow-lg"
    >
      <div className="relative w-full overflow-hidden bg-muted" style={{ paddingTop: "56.25%" }}>
        {article.image ? (
          <img
            src={article.image.url}
            alt={article.image.altText ?? article.title}
            className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-muted" />
        )}
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <p className="mb-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {date}
        </p>
        <h2 className="font-display mb-2 text-sm font-bold leading-snug text-foreground line-clamp-2 group-hover:text-crimson">
          {article.title}
        </h2>
        {article.excerpt && (
          <p className="mb-3 flex-1 text-xs text-muted-foreground line-clamp-3">{article.excerpt}</p>
        )}
        <span className="mt-auto flex items-center gap-1 text-xs font-semibold text-crimson">
          Read more <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}
