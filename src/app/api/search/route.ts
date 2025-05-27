import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { db } from '@/lib/firebase-admin';

interface Concept {
  id: string;
  name: string;
  connection: string;
  strength: number;
}

interface CourseResource {
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
  parent_course_id?: string;
  collection_path?: string;
}

interface AIAnalysis {
  summary: string;
  concepts: Concept[];
  keyPoints: string[];
  searchTerms: string[];
}

// Mapping from course code prefix to department name
export const prefixToDepartment: Record<string, string> = {
  Anthro: 'Anthropology',
  AAS: 'Asian American Studies Program',
  Astro: 'Astronomy',
  BioE: 'Bioengineering',
  Bio: 'Biology',
  Buddh: 'Buddhist Studies',
  ChemE: 'Chemical Engineering',
  Chem: 'Chemistry',
  Chinese: 'Chinese',
  City: 'City and Regional Planning',
  CEE: 'Civil and Environmental Engineering',
  CE: 'Civil and Environmental Engineering',
  Classics: 'Classics',
  CogSci: 'Cognitive Science',
  CWP: 'College Writing Program',
  CompLit: 'Comparative Literature',
  CS: 'Computer Science',
  DS: 'Data Science',
  Econ: 'Economics',
  Educ: 'Education',
  EE: 'Electrical Engineering',
  ERG: 'Energy and Resources Group',
  Eng: 'Engineering',
  English: 'English',
  EnvDes: 'Environmental Design',
  ESPM: 'Environmental Science, Policy, and Management',
  Ethnic: 'Ethnic Studies',
  French: 'French',
  Geog: 'Geography',
  German: 'German',
  Hist: 'History',
  HistArt: 'History of Art',
  IEOR: 'Industrial Engineering and Operations Research',
  Info: 'Information',
  IB: 'Integrative Biology',
  Italian: 'Italian Studies',
  Japn: 'Japanese',
  Korean: 'Korean',
  LA: 'Landscape Architecture',
  Ling: 'Linguistics',
  MSE: 'Materials Science and Engineering',
  Math: 'Mathematics',
  ME: 'Mechanical Engineering',
  MCB: 'Molecular and Cell Biology',
  Music: 'Music',
  NES: 'Near Eastern Studies',
  NE: 'Nuclear Engineering',
  NST: 'Nutritional Sciences and Toxicology',
  Phys: 'Physics',
  PolSci: 'Political Science',
  Psych: 'Psychology',
  PH: 'Public Health',
  PubPol: 'Public Policy',
  Rhet: 'Rhetoric',
  Scand: 'Scandinavian',
  Soc: 'Sociology',
  SAsian: 'South Asian',
  Span: 'Spanish',
  Stat: 'Statistics',
  TDPS: 'Theater, Dance, and Performance Studies',
  UGBA: 'Undergraduate Business Administration',
};

// Reverse mapping for department to prefixes
const departmentToPrefixes: Record<string, string[]> = {};
Object.entries(prefixToDepartment).forEach(([prefix, department]) => {
  if (!departmentToPrefixes[department]) {
    departmentToPrefixes[department] = [];
  }
  departmentToPrefixes[department].push(prefix);
});

// Enhanced function to extract course information
function extractCourseInfo(prompt: string): {
  courseCodes: string[];
  departments: string[];
  prefixes: string[];
  resourceTypes: string[];
  allTerms: string[];
} {
  const courseCodes: string[] = [];
  const departments: string[] = [];
  const prefixes: string[] = [];
  const resourceTypes: string[] = [];
  const allTerms: string[] = [];

  // Extract full course codes (e.g., "CS 61A", "MATH 1A", "Physics 8B")
  const courseMatches = prompt.match(/\b[A-Z]{2,6}\s*\d+[A-Z]?\b/gi);
  if (courseMatches) {
    courseMatches.forEach(match => {
      const normalized = match.replace(/\s+/g, ' ').trim();
      courseCodes.push(normalized);
      allTerms.push(normalized);
      
      // Extract prefix and map to department
      const prefix = normalized.split(' ')[0];
      prefixes.push(prefix);
      
      if (prefixToDepartment[prefix]) {
        departments.push(prefixToDepartment[prefix]);
      }
    });
  }

  // Extract course numbers (e.g., '8A', '101A')
  const numberMatches = prompt.match(/\b\d+[A-Z]?\b/g);
  if (numberMatches) {
    numberMatches.forEach(num => {
      courseCodes.push(num);
      allTerms.push(num);
    });
  }

  // Look for department names in the prompt
  Object.entries(prefixToDepartment).forEach(([prefix, department]) => {
    if (prompt.toLowerCase().includes(department.toLowerCase())) {
      departments.push(department);
      prefixes.push(prefix);
      allTerms.push(department);
    }
  });

  // Look for subject prefixes directly (e.g., "CS", "Math", "Physics")
  Object.keys(prefixToDepartment).forEach(prefix => {
    const regex = new RegExp(`\\b${prefix}\\b`, 'gi');
    if (regex.test(prompt)) {
      prefixes.push(prefix);
      departments.push(prefixToDepartment[prefix]);
      allTerms.push(prefix);
    }
  });

  // Common subject name variations
  const subjectVariations: Record<string, string> = {
    'physics': 'Phys',
    'math': 'Math',
    'mathematics': 'Math',
    'computer science': 'CS',
    'programming': 'CS',
    'chemistry': 'Chem',
    'biology': 'Bio',
    'economics': 'Econ',
    'statistics': 'Stat',
    'psychology': 'Psych',
    'history': 'Hist',
    'english': 'English'
  };

  Object.entries(subjectVariations).forEach(([variation, prefix]) => {
    if (prompt.toLowerCase().includes(variation)) {
      prefixes.push(prefix);
      if (prefixToDepartment[prefix]) {
        departments.push(prefixToDepartment[prefix]);
      }
      allTerms.push(variation);
    }
  });

  // Extract resource types
  const resourceTypeTerms = ['midterm', 'final', 'exam', 'homework', 'hw', 'quiz', 'lecture', 'notes', 'lab', 'discussion', 'project'];
  resourceTypeTerms.forEach(term => {
    if (prompt.toLowerCase().includes(term)) {
      resourceTypes.push(term);
      allTerms.push(term);
    }
  });

  return {
    courseCodes: Array.from(new Set(courseCodes)),
    departments: Array.from(new Set(departments)),
    prefixes: Array.from(new Set(prefixes)),
    resourceTypes: Array.from(new Set(resourceTypes)),
    allTerms: Array.from(new Set(allTerms))
  };
}

// Enhanced AI analysis function
async function analyzeWithAI(prompt: string, openai: OpenAI): Promise<AIAnalysis> {
  console.log('🤖 Starting AI analysis for:', prompt);
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini", // Using mini for cost efficiency
    messages: [
      {
        role: "system",
        content: `You are an expert academic assistant specializing in UC Berkeley courses. Analyze study queries and provide:
        1. A clear, comprehensive summary (2-3 sentences)
        2. 5 related concepts with their connection type and relevance strength (0.0-1.0)
        3. 4 key learning points
        4. Search terms that would help find relevant academic resources
        
        Focus on Berkeley course subjects and academic terminology.
        
        Format your response as JSON:
        {
          "summary": "Clear explanation of the topic...",
          "concepts": [
            {
              "name": "Concept Name",
              "connection": "How it relates (e.g., 'Fundamental principle', 'Related topic')",
              "strength": 0.9
            }
          ],
          "keyPoints": [
            "Important point 1",
            "Important point 2"
          ],
          "searchTerms": ["term1", "term2"]
        }`
      },
      {
        role: "user",
        content: `Analyze this UC Berkeley academic query: "${prompt}"`
      }
    ],
    temperature: 0.3,
    max_tokens: 1000
  });

  try {
    const response = completion.choices[0].message.content;
    if (!response) throw new Error('Empty AI response');
    
    console.log('🤖 AI response received, parsing...');
    
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in AI response');
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      summary: parsed.summary || 'Analysis not available',
      concepts: parsed.concepts?.map((c: any, index: number) => ({
        id: `concept-${index}`,
        name: c.name || 'Unknown Concept',
        connection: c.connection || 'Related topic',
        strength: Math.min(Math.max(c.strength || 0.5, 0), 1)
      })) || [],
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      searchTerms: Array.isArray(parsed.searchTerms) ? parsed.searchTerms : []
    };
  } catch (error) {
    console.error('🚨 AI parsing error:', error);
    
    // Fallback analysis
    const extractedInfo = extractCourseInfo(prompt);
    return {
      summary: `This query relates to ${extractedInfo.departments.join(', ') || 'academic topics'}. Understanding these concepts requires connecting theoretical knowledge with practical applications.`,
      concepts: [
        { id: 'concept-1', name: 'Core Principles', connection: 'Fundamental concepts', strength: 0.9 },
        { id: 'concept-2', name: 'Applications', connection: 'Practical usage', strength: 0.8 },
        { id: 'concept-3', name: 'Problem Solving', connection: 'Analytical skills', strength: 0.7 },
        { id: 'concept-4', name: 'Prerequisites', connection: 'Foundation knowledge', strength: 0.6 }
      ],
      keyPoints: [
        'Focus on understanding fundamental principles',
        'Practice applying concepts to real problems',
        'Connect theory with practical examples',
        'Review course prerequisites if needed'
      ],
      searchTerms: extractedInfo.allTerms
    };
  }
}

// Helper: Find resources by concept/term match in metadata
async function findResourcesByConceptsOrTerms(searchTerms: string[]): Promise<CourseResource[]> {
  const resources: CourseResource[] = [];
  const coursesRef = db.collection('courses');

  // For each term, search for resources in all courses where metadata fields match
  for (const term of searchTerms) {
    // Search in resource_type, source, department, and instructor fields
    const resourceTypeQuery = await coursesRef.where('resources', '!=', null).limit(10).get();
    for (const courseDoc of resourceTypeQuery.docs) {
      const courseData = courseDoc.data();
      try {
        const resourcesQuery = await courseDoc.ref.collection('resources').limit(10).get();
        resourcesQuery.docs.forEach(resourceDoc => {
          const resourceData = resourceDoc.data();
          // Check if any metadata field matches the term (case-insensitive)
          const meta = resourceData.metadata || {};
          const match = [
            resourceData.resource_type,
            resourceData.semester,
            resourceData.year,
            meta.resource_type,
            meta.source,
            meta.department,
            meta.instructor
          ].some(
            v => typeof v === 'string' && v.toLowerCase().includes(term.toLowerCase())
          );
          if (match) {
            resources.push({
              id: resourceDoc.id,
              parent_course_id: courseDoc.id,
              collection_path: `courses/${courseDoc.id}/resources/${resourceDoc.id}`,
              course_code: courseData.course_code || '',
              course_name: courseData.course_name || '',
              department: courseData.department || '',
              school: courseData.school || 'UC Berkeley',
              semester: resourceData.semester || '',
              year: resourceData.year || '',
              resource_type: resourceData.resource_type || '',
              resource_url: resourceData.resource_url || '',
              metadata: resourceData.metadata || {}
            });
          }
        });
      } catch (e) {
        // Ignore if no resources subcollection
      }
    }
  }
  return resources;
}

// Refactored: Use collection group queries for exams and resources
async function searchCourseResources(prompt: string, searchTerms: string[]): Promise<CourseResource[]> {
  console.log('🔍 Starting fast collection group search...');
  const extractedInfo = extractCourseInfo(prompt);
  console.log('🔍 Extracted course info:', extractedInfo);
  const resourcesMap = new Map<string, CourseResource>();
  function addResource(doc: any, parentId: string, collectionPath: string, data: any) {
    if (!resourcesMap.has(doc.id)) {
      resourcesMap.set(doc.id, {
        id: doc.id,
        parent_course_id: parentId,
        collection_path: collectionPath,
        course_code: data.course_code || '',
        course_name: data.course_name || '',
        department: data.department || '',
        school: data.school || 'UC Berkeley',
        semester: data.semester || '',
        year: data.year || '',
        resource_type: data.resource_type || '',
        resource_url: data.resource_url || '',
        metadata: data.metadata || {}
      });
    }
  }
  // Helper to check if a resource matches both subject and number
  function matchesSubjectAndNumber(data: any, subject: string, number: string) {
    const code = (data.course_code || '').toLowerCase();
    const name = (data.course_name || '').toLowerCase();
    return (
      (code.includes(subject.toLowerCase()) && code.includes(number.toLowerCase())) ||
      (name.includes(subject.toLowerCase()) && name.includes(number.toLowerCase()))
    );
  }
  // 1. Search exams by course_code and course_name
  const subject = extractedInfo.departments.length > 0 ? extractedInfo.departments[0] : '';
  const numberCodes = extractedInfo.courseCodes.filter(code => /\d+[A-Z]?/i.test(code));
  if (numberCodes.length > 0 && subject) {
    const examsQuery = db.collectionGroup('exams');
    const examsSnap = await examsQuery.get();
    examsSnap.docs.forEach(doc => {
      const data = doc.data();
      // Only match if both subject and number are present
      for (const number of numberCodes) {
        if (matchesSubjectAndNumber(data, subject, number)) {
          const parentId = doc.ref.parent.parent?.id || '';
          addResource(doc, parentId, doc.ref.path, data);
          return;
        }
      }
    });
  } else if (extractedInfo.courseCodes.length > 0 || extractedInfo.allTerms.length > 0) {
    // Fallback to previous logic if no number/subject combo
    const examsQuery = db.collectionGroup('exams');
    const examsSnap = await examsQuery.get();
    examsSnap.docs.forEach(doc => {
      const data = doc.data();
      const codeMatch = extractedInfo.courseCodes.some(code =>
        (data.course_code || '').toLowerCase().includes(code.toLowerCase())
      );
      const nameMatch = extractedInfo.allTerms.some(term =>
        (data.course_name || '').toLowerCase().includes(term.toLowerCase())
      );
      if (codeMatch || nameMatch) {
        const parentId = doc.ref.parent.parent?.id || '';
        addResource(doc, parentId, doc.ref.path, data);
      }
    });
  }
  // 2. Search resources by course_code and course_name (same logic as above)
  if (numberCodes.length > 0 && subject) {
    const resourcesQuery = db.collectionGroup('resources');
    const resourcesSnap = await resourcesQuery.get();
    resourcesSnap.docs.forEach(doc => {
      const data = doc.data();
      for (const number of numberCodes) {
        if (matchesSubjectAndNumber(data, subject, number)) {
          const parentId = doc.ref.parent.parent?.id || '';
          addResource(doc, parentId, doc.ref.path, data);
          return;
        }
      }
    });
  } else if (extractedInfo.courseCodes.length > 0 || extractedInfo.allTerms.length > 0) {
    const resourcesQuery = db.collectionGroup('resources');
    const resourcesSnap = await resourcesQuery.get();
    resourcesSnap.docs.forEach(doc => {
      const data = doc.data();
      const codeMatch = extractedInfo.courseCodes.some(code =>
        (data.course_code || '').toLowerCase().includes(code.toLowerCase())
      );
      const nameMatch = extractedInfo.allTerms.some(term =>
        (data.course_name || '').toLowerCase().includes(term.toLowerCase())
      );
      if (codeMatch || nameMatch) {
        const parentId = doc.ref.parent.parent?.id || '';
        addResource(doc, parentId, doc.ref.path, data);
      }
    });
  }
  // 3. Also include recommended resources by AI concepts/terms as before
  if (searchTerms && searchTerms.length > 0) {
    const recommended = await findResourcesByConceptsOrTerms(searchTerms);
    for (const rec of recommended) {
      if (!resourcesMap.has(rec.id)) {
        resourcesMap.set(rec.id, rec);
      }
    }
  }
  const resources = Array.from(resourcesMap.values());
  console.log(`🔍 Found ${resources.length} total resources (including recommendations)`);
  // Sort by relevance: exact match > concept/term match > fallback
  resources.sort((a, b) => {
    const aExact = extractedInfo.courseCodes.includes(a.course_code);
    const bExact = extractedInfo.courseCodes.includes(b.course_code);
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    // Prefer resources that match search terms in metadata
    const aMeta = Object.values(a.metadata || {}).join(' ').toLowerCase();
    const bMeta = Object.values(b.metadata || {}).join(' ').toLowerCase();
    const aTerm = searchTerms.some(term => aMeta.includes(term.toLowerCase()));
    const bTerm = searchTerms.some(term => bMeta.includes(term.toLowerCase()));
    if (aTerm && !bTerm) return -1;
    if (!aTerm && bTerm) return 1;
    // Then by year (newest first)
    return b.year.localeCompare(a.year);
  });
  return resources;
}

// Move the POST export to the end of the file, after all function definitions
export async function POST(req: NextRequest) {
  console.log('🚀 API route hit: /api/search');
  try {
    // Validate OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OpenAI API key missing');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }
    // Parse request body
    const body = await req.json();
    const { prompt } = body;
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      console.error('❌ Invalid prompt');
      return NextResponse.json(
        { error: 'Valid prompt is required' },
        { status: 400 }
      );
    }
    console.log('🔎 Processing search for:', prompt);
    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    // Test Firebase connection
    try {
      const testQuery = await db.collection('courses').limit(1).get();
      if (testQuery.empty) {
        console.warn('⚠️ No courses found in collection');
      } else {
        console.log('✅ Firebase courses collection accessible');
      }
    } catch (error) {
      console.error('❌ Firebase connection failed:', error);
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }
    // Extract course information first
    const extractedInfo = extractCourseInfo(prompt);
    console.log('📋 Extracted course info:', extractedInfo);
    // Run AI analysis and Firebase search in parallel
    console.log('⚡ Starting parallel processing...');
    const [aiAnalysis, resources] = await Promise.all([
      analyzeWithAI(prompt, openai),
      searchCourseResources(prompt, extractedInfo.allTerms)
    ]);
    // Prepare response
    const response = {
      success: true,
      query: prompt,
      summary: aiAnalysis.summary,
      concepts: aiAnalysis.concepts,
      keyPoints: aiAnalysis.keyPoints,
      resources: resources.slice(0, 12), // Limit to 12 for UI
      extractedInfo: extractedInfo, // Include extracted course info for debugging
      stats: {
        totalResources: resources.length,
        conceptsFound: aiAnalysis.concepts.length,
        coursesDetected: extractedInfo.courseCodes.length,
        departmentsDetected: extractedInfo.departments.length
      }
    };
    console.log('✅ Search completed successfully');
    console.log('📊 Stats:', response.stats);
    return NextResponse.json(response);
  } catch (error) {
    console.error('💥 Search error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

//