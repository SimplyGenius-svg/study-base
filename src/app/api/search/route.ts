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
const prefixToDepartment: Record<string, string> = {
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
  let courseCodes: string[] = [];
  const departments: string[] = [];
  const prefixes: string[] = [];
  const resourceTypes: string[] = [];
  let allTerms: string[] = [];

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

  // Add underscore and no-space variants for each course code
  const extraVariants: string[] = [];
  courseCodes.forEach(code => {
    if (code.includes(' ')) {
      const underscore = code.replace(/\s+/g, '_');
      const nospace = code.replace(/\s+/g, '');
      extraVariants.push(underscore, nospace);
    }
  });
  courseCodes = Array.from(new Set([...courseCodes, ...extraVariants]));
  allTerms = Array.from(new Set([...allTerms, ...extraVariants]));

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
  console.time('AI Analysis Duration');
  
  try {
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
                "id": "unique_concept_id",
                "name": "Concept Name",
                "connection": "How it relates to the query",
                "strength": 0.8
              }
            ],
            "keyPoints": ["Point 1", "Point 2", "Point 3", "Point 4"],
            "searchTerms": ["term1", "term2", "term3"]
          }`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('Empty response from OpenAI API');
    }

    console.log('📝 AI Response received:', content);
    
    const analysis = JSON.parse(content);
    console.log('✅ AI Analysis parsed successfully:', {
      summaryLength: analysis.summary.length,
      conceptsCount: analysis.concepts.length,
      keyPointsCount: analysis.keyPoints.length,
      searchTermsCount: analysis.searchTerms.length
    });
    
    console.timeEnd('AI Analysis Duration');
    return analysis;
  } catch (error) {
    console.error('❌ Error in AI analysis:', error);
    console.timeEnd('AI Analysis Duration');
    throw error;
  }
}

// Helper: Find resources by concept/term match in metadata
// (REMOVE THIS FUNCTION, since there is no resources collection)

// Refactored: Only search exams for matched courses
async function searchCourseExams(prompt: string, searchTerms: string[]): Promise<CourseResource[]> {
  console.log('🔍 Starting course-title-aligned search...');
  
  // Debug Firebase connection
  try {
    console.log('🔌 Testing Firebase connection...');
    const collections = await db.listCollections();
    console.log('📚 Available collections:', collections.map(c => c.id));
    
    // Try to get a single document to test read access
    const testDoc = await db.collection('courses').limit(1).get();
    console.log('📄 Database read test:', {
      success: true,
      collectionExists: true,
      documentCount: testDoc.size,
      empty: testDoc.empty
    });
  } catch (error) {
    console.error('❌ Firebase connection error:', error);
    throw new Error('Failed to connect to database');
  }

  const extractedInfo = extractCourseInfo(prompt);
  console.log('🔍 Search Criteria:', {
    courseCodes: extractedInfo.courseCodes,
    departments: extractedInfo.departments,
    allTerms: extractedInfo.allTerms,
    searchTerms: searchTerms
  });
  
  const resources: CourseResource[] = [];

  // Normalize course codes for exact matching (remove non-alphanumeric, lowercase)
  const normalizedCodeVariants = extractedInfo.courseCodes.map(code =>
    code.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
  );

  // 1. Find all courses whose document ID matches exactly (case-insensitive, ignoring underscores/spaces)
  const coursesSnap = await db.collection('courses').get();
  console.log(`📚 Total courses in database: ${coursesSnap.docs.length}`);
  console.log('📋 Sample course IDs in database:', coursesSnap.docs.slice(0, 3).map(doc => doc.id));

  // Flexible matching: match if docIdNormalized equals, ends with, or contains any code variant
  const matchedCourses = coursesSnap.docs.filter(doc => {
    const docIdNormalized = doc.id.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const matches = normalizedCodeVariants.some(codeVariant =>
      docIdNormalized === codeVariant ||
      docIdNormalized.endsWith(codeVariant) ||
      docIdNormalized.includes(codeVariant)
    );
    if (matches) {
      console.log(`✅ Flexible Document ID match found: ${doc.id}`);
    } else {
      console.log(`❌ No flexible match for course ID: ${doc.id}`);
    }
    return matches;
  });

  console.log(`📚 Found ${matchedCourses.length} matching courses by ID`);
  if (matchedCourses.length > 0) {
    console.log('🎯 Matched course IDs:', matchedCourses.map(doc => doc.id));
  }

  // 2. For each matched course, get its exams subcollection
  for (const courseDoc of matchedCourses) {
    console.log(`🔍 Fetching exams for course ID: ${courseDoc.id}`);
    const examsSnap = await courseDoc.ref.collection('exams').get();
    console.log(`📄 Found ${examsSnap.docs.length} exams for this course`);
    examsSnap.docs.forEach(examDoc => {
      const data = examDoc.data();
      resources.push({
        id: examDoc.id,
        parent_course_id: courseDoc.id,
        collection_path: `courses/${courseDoc.id}/exams/${examDoc.id}`,
        course_code: courseDoc.id, // Use doc ID as course_code
        course_name: '', // No name available
        department: '',
        school: '',
        semester: data.semester || '',
        year: data.year || '',
        resource_type: data.resource_type || (data.metadata?.resource_type || ''),
        resource_url: data.resource_url || '',
        metadata: data.metadata || {}
      });
    });
  }

  console.log(`🔍 Found ${resources.length} total exams from matched courses`);
  if (resources.length > 0) {
    console.log('📚 Sample resources found:', resources.slice(0, 3).map(resource => ({
      course_code: resource.course_code,
      resource_type: resource.resource_type,
      year: resource.year
    })));
  }

  // Sort by year (newest first)
  resources.sort((a, b) => b.year.localeCompare(a.year));
  // Limit to 15 resources
  return resources.slice(0, 15);
}

// Move the POST export to the end of the file, after all function definitions
export async function POST(req: NextRequest) {
  console.log('🚀 API Route called');
  console.time('Total Request Duration');
  
  try {
    const body = await req.json();
    console.log('📦 Request body:', {
      prompt: body.prompt?.substring(0, 100) + '...',
      hasFilters: !!body.filters,
      filterCount: Object.keys(body.filters || {}).length
    });

    if (!body.prompt || typeof body.prompt !== 'string') {
      console.error('❌ Missing or invalid prompt in request');
      return NextResponse.json({ error: 'Valid prompt is required' }, { status: 400 });
    }

    // Extract course information
    console.time('Course Info Extraction');
    const courseInfo = extractCourseInfo(body.prompt);
    console.log('📚 Extracted course info:', courseInfo);
    console.timeEnd('Course Info Extraction');

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // Get AI analysis
    console.time('AI Analysis');
    const analysis = await analyzeWithAI(body.prompt, openai);
    console.timeEnd('AI Analysis');

    // Search for course exams
    console.time('Course Search');
    const searchResults = await searchCourseExams(body.prompt, analysis.searchTerms);
    console.log('🔍 Search results count:', searchResults.length);
    console.timeEnd('Course Search');

    // Prepare response
    const response = {
      analysis,
      searchResults,
      courseInfo
    };

    console.log('✅ Request completed successfully');
    console.timeEnd('Total Request Duration');
    
    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('❌ Error in API route:', error);
    console.timeEnd('Total Request Duration');
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

//