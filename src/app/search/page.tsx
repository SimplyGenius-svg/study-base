'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, ChevronDown, ChevronUp, BookOpen, Calendar, User, Tag, Building } from 'lucide-react';

interface SearchFilters {
  semester?: string;
  year?: string;
  instructor?: string;
  resource_type?: string;
  department?: string;
  sort_by?: 'semester' | 'year' | 'resource_type';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

interface SearchResult {
  summary: string;
  concepts: Array<{
    id: string;
    label: string;
    related: string[];
  }>;
  resources: Array<{
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
  }>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
  filters: {
    available: {
      semesters: string[];
      years: string[];
      instructors: string[];
      resource_types: string[];
      departments: string[];
    };
  };
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [error, setError] = useState<string | null>(null);

  // Test API connection on component mount
  useEffect(() => {
    const testConnection = async () => {
      try {
        const response = await fetch('/api/search/test');
        const data = await response.json();
        console.log('API test response:', data);
      } catch (err) {
        console.error('API test failed:', err);
      }
    };
    testConnection();
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) {
      setError('Please enter a search term');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null); // Clear previous results

    try {
      console.log('Making request to /api/search');
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: query,
          filters,
        }),
      });

      console.log('Response status:', response.status);
      
      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      // Validate the response structure
      if (!data.summary || !Array.isArray(data.concepts) || !Array.isArray(data.resources)) {
        throw new Error('Invalid response format from server');
      }

      setResults(data);
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page when filters change
    }));
  };

  const handleSort = (sortBy: SearchFilters['sort_by']) => {
    setFilters(prev => ({
      ...prev,
      sort_by: sortBy,
      sort_order: prev.sort_by === sortBy && prev.sort_order === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search for courses, topics, or resources..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Filter className="h-5 w-5" />
                <span>Filters</span>
                {showFilters ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </button>
              <button
                onClick={handleSearch}
                disabled={loading}
                className={`px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>

            {/* Filters Panel */}
            {showFilters && results?.filters.available && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                  <select
                    value={filters.semester || ''}
                    onChange={(e) => handleFilterChange('semester', e.target.value)}
                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Semesters</option>
                    {results.filters.available.semesters.map((semester) => (
                      <option key={semester} value={semester}>{semester}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <select
                    value={filters.year || ''}
                    onChange={(e) => handleFilterChange('year', e.target.value)}
                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Years</option>
                    {results.filters.available.years.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Instructor</label>
                  <select
                    value={filters.instructor || ''}
                    onChange={(e) => handleFilterChange('instructor', e.target.value)}
                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Instructors</option>
                    {results.filters.available.instructors.map((instructor) => (
                      <option key={instructor} value={instructor}>{instructor}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resource Type</label>
                  <select
                    value={filters.resource_type || ''}
                    onChange={(e) => handleFilterChange('resource_type', e.target.value)}
                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Types</option>
                    {results.filters.available.resource_types.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select
                    value={filters.department || ''}
                    onChange={(e) => handleFilterChange('department', e.target.value)}
                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Departments</option>
                    {results.filters.available.departments.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {results && !loading && (
          <div className="space-y-8">
            {/* Summary */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Summary</h2>
              <div className="prose max-w-none">
                {results.summary.split('\n').map((paragraph, index) => (
                  <p key={index} className="text-gray-600 mb-4">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>

            {/* Related Concepts */}
            {results.concepts.length > 0 && (
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Related Concepts</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.concepts.map((concept) => (
                    <div key={concept.id} className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-800">{concept.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resources */}
            {results.resources.length > 0 && (
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Resources</h2>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => handleSort('semester')}
                      className="flex items-center space-x-1 text-gray-600 hover:text-gray-900"
                    >
                      <Calendar className="h-4 w-4" />
                      <span>Sort by Semester</span>
                    </button>
                    <button
                      onClick={() => handleSort('resource_type')}
                      className="flex items-center space-x-1 text-gray-600 hover:text-gray-900"
                    >
                      <Tag className="h-4 w-4" />
                      <span>Sort by Type</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {results.resources.map((resource) => (
                    <div key={resource.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            <a href={resource.resource_url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
                              {resource.course_code} - {resource.course_name}
                            </a>
                          </h3>
                          <div className="mt-2 flex flex-wrap gap-4">
                            <div className="flex items-center text-sm text-gray-500">
                              <Building className="h-4 w-4 mr-1" />
                              {resource.department}
                            </div>
                            <div className="flex items-center text-sm text-gray-500">
                              <Calendar className="h-4 w-4 mr-1" />
                              {resource.semester} {resource.year}
                            </div>
                            {resource.metadata.instructor && (
                              <div className="flex items-center text-sm text-gray-500">
                                <User className="h-4 w-4 mr-1" />
                                {resource.metadata.instructor}
                              </div>
                            )}
                            <div className="flex items-center text-sm text-gray-500">
                              <Tag className="h-4 w-4 mr-1" />
                              {resource.resource_type}
                            </div>
                          </div>
                        </div>
                        <a
                          href={resource.resource_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-blue-600 hover:text-blue-800"
                        >
                          <BookOpen className="h-5 w-5 mr-1" />
                          View Resource
                        </a>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {results.pagination.total_pages > 1 && (
                  <div className="mt-6 flex justify-center space-x-2">
                    {Array.from({ length: results.pagination.total_pages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-4 py-2 rounded-lg ${
                          page === results.pagination.page
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 