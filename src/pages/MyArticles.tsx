import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getUserArticles } from '../lib/articles';
import { ArticleCard } from '../components/ArticleCard';
import { Layout } from '../components/Layout';
import { FileText, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Article {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  authorId: string;
  authorName: string;
  createdAt: any;
  updatedAt: any;
  tags: string[];
  isPublished: boolean;
  likes: number;
  likedBy: string[];
}

export default function MyArticles() {
  const { user } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMyArticles = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const userArticles = await getUserArticles(user.uid);
        setArticles(userArticles);
      } catch (err) {
        console.error('Error fetching articles:', err);
        setError('Failed to load your articles');
      } finally {
        setLoading(false);
      }
    };

    fetchMyArticles();
  }, [user]);

  //if (!user) {
    //return (
      //<Layout>
        //<div className="max-w-4xl mx-auto px-4 py-8">
          //<div className="text-center">
            //<h1 className="text-2xl font-bold text-gray-900 mb-4">Please Sign In</h1>
            //<p className="text-gray-600">You need to be signed in to view your articles.</p>
          //</div>
        //</div>
      //</Layout>
   // );
 // }

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">My Articles</h1>
          </div>
          <Link
            to="/editor"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Article
          </Link>
        </div>

        {articles.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-600 mb-2">No articles yet</h2>
            <p className="text-gray-500 mb-6">Start writing your first article to see it here.</p>
            <Link
              to="/editor"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Write Your First Article
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}