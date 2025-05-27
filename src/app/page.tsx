"use client";
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Upload, BookOpen, Users, Zap, FileText, Star, Clock, TrendingUp, ArrowRight, Brain, MessageSquare, Lightbulb, X, Heart, Share2, Briefcase, GraduationCap, DollarSign, Target, Rocket, ExternalLink, Calendar, School, CheckCircle, AlertCircle } from 'lucide-react';

interface Concept {
  id: string;
  name: string;
  connection: string;
  strength: number;
}

interface Resource {
  id: string;
  course_code: string;
  course_name: string;
  department: string;
  semester: string;
  year: string;
  resource_type: string;
  resource_url: string;
  school: string;
  metadata: {
    instructor?: string;
    resource_type: string;
    source: string;
    department: string;
  };
}

interface SearchResults {
  success: boolean;
  summary: string;
  concepts: Concept[];
  keyPoints: string[];
  resources: Resource[];
  stats: {
    totalResources: number;
    conceptsFound: number;
    searchTermsUsed: number;
  };
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) {
      setError('Please enter a search query');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setResults(null);
    setSelectedConcept(null);
    
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: query }),
      });
      
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Search failed');
      }
      
      const data = await response.json();
      
      if (data.searchResults && data.analysis) {
        setResults({
          success: true,
          summary: data.analysis.summary,
          concepts: data.analysis.concepts,
          keyPoints: data.analysis.keyPoints,
          resources: data.searchResults,
          stats: {
            totalResources: data.searchResults.length,
            conceptsFound: data.analysis.concepts.length,
            searchTermsUsed: data.analysis.searchTerms?.length || 0,
          }
        });
      } else {
        throw new Error(data.message || 'Search failed');
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const ConceptCard = ({ concept, isSelected, onClick }: { 
    concept: Concept; 
    isSelected: boolean; 
    onClick: () => void;
  }) => (
    <div
      className={`cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'bg-blue-50 border-blue-300 shadow-md'
          : 'bg-white border-gray-200 hover:border-blue-200 hover:shadow-sm'
      } border-2 rounded-xl p-4`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div 
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            isSelected ? 'bg-blue-100' : 'bg-gray-100'
          }`}
        >
          <Lightbulb className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 mb-1">Relevance</div>
          <div className="flex items-center">
            <div className="w-12 bg-gray-200 rounded-full h-1.5 mr-2">
              <div 
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${concept.strength * 100}%` }}
              />
            </div>
            <span className="text-xs font-medium text-gray-700">
              {Math.round(concept.strength * 100)}%
            </span>
          </div>
        </div>
      </div>
      
      <h3 className="font-semibold text-gray-900 mb-1 text-sm">{concept.name}</h3>
      <p className="text-xs text-gray-600">{concept.connection}</p>
    </div>
  );

  const ResourceCard = ({ resource }: { resource: Resource }) => (
    <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-green-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
              {resource.course_code}
            </h3>
            <p className="text-sm text-gray-600 truncate">{resource.course_name}</p>
            <div className="flex items-center mt-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {resource.resource_type}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            {resource.school}
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div className="flex items-center text-gray-600">
          <Users className="w-4 h-4 mr-1.5 flex-shrink-0" />
          <span className="truncate">{resource.metadata?.instructor || 'Unknown'}</span>
        </div>
        <div className="flex items-center text-gray-600">
          <Calendar className="w-4 h-4 mr-1.5 flex-shrink-0" />
          <span className="truncate">{resource.semester} {resource.year}</span>
        </div>
        <div className="flex items-center text-gray-600">
          <School className="w-4 h-4 mr-1.5 flex-shrink-0" />
          <span className="truncate">{resource.department}</span>
        </div>
        <div className="flex items-center text-gray-600">
          <BookOpen className="w-4 h-4 mr-1.5 flex-shrink-0" />
          <span className="truncate">{resource.metadata.source}</span>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 text-sm text-gray-500">
          <div className="flex items-center">
            <Star className="w-4 h-4 mr-1" />
            <span>4.{Math.floor(Math.random() * 5) + 3}</span>
          </div>
          <div className="flex items-center">
            <Heart className="w-4 h-4 mr-1" />
            <span>{Math.floor(Math.random() * 200) + 50}</span>
          </div>
        </div>
        <a
          href={resource.resource_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <span>Access</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen graph-paper">
      {/* Space Stickers */}
      <div className="space-sticker rocket" style={{ top: '5%', left: '5%', transform: 'rotate(-15deg)' }} />
      <div className="space-sticker planet" style={{ top: '15%', right: '10%' }} />
      <div className="space-sticker comet" style={{ bottom: '20%', left: '10%', transform: 'rotate(45deg)' }} />
      <div className="space-sticker rocket" style={{ bottom: '10%', right: '5%', transform: 'rotate(60deg)' }} />
      <div className="space-sticker planet" style={{ top: '50%', left: '15%', transform: 'scale(0.8)' }} />
      <div className="space-sticker comet" style={{ top: '30%', right: '20%', transform: 'rotate(-30deg)' }} />
      <div className="space-sticker star" style={{ top: '70%', left: '30%', transform: 'rotate(15deg)' }} />
      <div className="space-sticker planet" style={{ top: '20%', left: '40%', transform: 'scale(0.7)' }} />
      <div className="space-sticker star" style={{ bottom: '30%', right: '25%', transform: 'rotate(-45deg)' }} />
      <div className="space-sticker rocket" style={{ top: '60%', right: '15%', transform: 'rotate(120deg)' }} />

      {/* Navigation */}
      <nav className="bg-white/90 backdrop-blur-md shadow-sm border-b border-blue-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-semibold text-blue-800">StudyBase</h1>
          </div>
          <div className="flex items-center space-x-4">
            {results && (
              <div className="hidden sm:flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                  <span>{results.stats.totalResources} resources</span>
                </div>
                <div className="flex items-center">
                  <Brain className="w-4 h-4 mr-1 text-blue-500" />
                  <span>{results.stats.conceptsFound} concepts</span>
                </div>
              </div>
            )}
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
              Sign In
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Section */}
        <div className="mb-8">
          <div className={`transition-all duration-500 ${results ? 'mb-8' : 'text-center mb-16 py-16'}`}>
            {!results && (
              <>
                <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
                  Stop wasting time <br />
                  <span className="text-blue-600">searching for answers</span>
                </h1>
                <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                  The AI-powered study platform that remembers everything. Ask questions, upload notes, and build a collective brain for your classes.
                </p>
              </>
            )}
            
            {/* Search Bar */}
            <form onSubmit={handleSearch} className={`${results ? 'max-w-3xl' : 'max-w-2xl'} mx-auto`}>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-400 w-5 h-5" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Try: Physics 8B electromagnetic waves and quantum mechanics"
                  className="w-full pl-12 pr-32 py-4 text-lg rounded-xl border border-blue-200 bg-white/90 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-lg"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 
                      Analyzing...
                    </span>
                  ) : (
                    'Search'
                  )}
                </button>
              </div>
              {!results && (
                <p className="text-sm text-gray-500 mt-2">
                  Join thousands of students using StudyBase
                </p>
              )}
            </form>
            
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mt-4 max-w-xl mx-auto flex items-center">
                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-16">
            <div className="inline-flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <Brain className="w-6 h-6 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-900 mb-1">AI is analyzing your query...</p>
                <p className="text-sm text-gray-600">Finding connected concepts and relevant resources</p>
              </div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {results && !isLoading && (
          <div className="space-y-8">
            {/* AI Summary */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-8 py-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Brain className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">AI Analysis</h2>
                      <p className="text-sm text-gray-600">Comprehensive breakdown of your query</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Analysis complete</span>
                  </div>
                </div>
              </div>
              
              <div className="p-8">
                <div className="prose max-w-none mb-6">
                  <p className="text-gray-700 text-lg leading-relaxed">{results.summary}</p>
                </div>
                
                {results.keyPoints && results.keyPoints.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                      <Target className="w-4 h-4 mr-2 text-blue-600" />
                      Key Learning Points
                    </h3>
                    <div className="grid md:grid-cols-2 gap-3">
                      {results.keyPoints.map((point, index) => (
                        <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                          <ArrowRight className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700 text-sm">{point}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Connected Concepts */}
            {results.concepts && results.concepts.length > 0 && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-8 py-6 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                      <Lightbulb className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Connected Concepts</h2>
                      <p className="text-sm text-gray-600">Related topics to explore and understand</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {results.concepts.map((concept) => (
                      <ConceptCard
                        key={concept.id}
                        concept={concept}
                        isSelected={selectedConcept?.id === concept.id}
                        onClick={() => setSelectedConcept(selectedConcept?.id === concept.id ? null : concept)}
                      />
                    ))}
                  </div>
                  
                  {selectedConcept && (
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
                      <h3 className="text-lg font-semibold mb-2">{selectedConcept.name}</h3>
                      <p className="text-blue-100 mb-3">{selectedConcept.connection}</p>
                      <p className="text-blue-100 text-sm">
                        This concept has a {Math.round(selectedConcept.strength * 100)}% relevance to your query. 
                        Understanding this will help you grasp the broader context of your study topic.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Resources */}
            {results.resources && results.resources.length > 0 && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-green-50 to-blue-50 px-8 py-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                        <FileText className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">Study Resources</h2>
                        <p className="text-sm text-gray-600">Curated materials from your query</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      {results.resources.length} found
                    </span>
                  </div>
                </div>
                
                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {results.resources.map((resource) => (
                      <ResourceCard key={resource.id} resource={resource} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* No Resources Found */}
            {results.resources && results.resources.length === 0 && (
              <div className="text-center py-16 bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200">
                <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No resources found</h3>
                <p className="text-gray-600 mb-4">
                  We couldn't find specific resources for your query, but the AI analysis above should help!
                </p>
                <button
                  onClick={() => setQuery('')}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Try Another Search
                </button>
              </div>
            )}
          </div>
        )}

        {/* How It Works - Only show when no results */}
        {!results && !isLoading && (
          <>
            <div className="mb-20">
              <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
                How StudyBase Works
              </h2>
              
              <div className="grid md:grid-cols-3 gap-8">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 shadow-lg border border-blue-100">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                    <MessageSquare className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Ask Anything
                  </h3>
                  <p className="text-gray-600">
                    Type your question naturally. "ECON 1 supply and demand graph explanation" or "CS 61A recursion examples" - just like you'd ask a friend.
                  </p>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 shadow-lg border border-blue-100">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-6">
                    <Zap className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Instant Smart Answers
                  </h3>
                  <p className="text-gray-600">
                    Get AI-powered explanations plus real student notes. If someone asked before, you get instant results. If not, AI generates the answer and saves it.
                  </p>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 shadow-lg border border-blue-100">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-6">
                    <Brain className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Everyone Benefits
                  </h3>
                  <p className="text-gray-600">
                    Upload your notes, get auto-generated flashcards and summaries. Your contribution helps thousands of students in the same classes.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}