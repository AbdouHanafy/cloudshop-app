from typing import Optional
import os

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="CloudShop Learn - Catalog Service")

SERVICE_METADATA = {
    "product": "cloudshop-learn",
    "service": "catalog",
    "status": "ok",
    "domain": "e-learning",
}

def get_cors_origins():
    raw_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173")
    return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]


app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

COURSES = [
    {
        "id": 101,
        "slug": "azure-cloud-bootcamp",
        "title": "Azure Cloud Bootcamp",
        "category": "Cloud Engineering",
        "level": "Beginner",
        "duration": "8 weeks",
        "price": 129,
        "rating": 4.8,
        "students": 1240,
        "lessons": 42,
        "instructor": "Maya Hassan",
        "headline": "Build and deploy production-ready cloud workloads on Azure.",
        "description": "Learn Azure fundamentals, containers, monitoring, networking, and deployment workflows through practical labs.",
        "skills": ["Azure", "Docker", "Monitoring", "Networking"],
        "modules": [
            "Cloud foundations and core Azure services",
            "Containerized apps with Docker and App Service",
            "Storage, networking, and identity essentials",
            "Production observability and deployment pipelines",
        ],
        "featured": True,
        "color": "#1d4ed8",
    },
    {
        "id": 102,
        "slug": "frontend-motion-lab",
        "title": "Frontend Motion Lab",
        "category": "UI Engineering",
        "level": "Intermediate",
        "duration": "6 weeks",
        "price": 89,
        "rating": 4.9,
        "students": 860,
        "lessons": 31,
        "instructor": "Karim Nader",
        "headline": "Design interfaces that feel crisp, expressive, and conversion-ready.",
        "description": "Master layout systems, visual hierarchy, animation, and component thinking with modern React workflows.",
        "skills": ["React", "Motion", "Design Systems", "Accessibility"],
        "modules": [
            "Visual direction and typography systems",
            "Responsive layout patterns that scale",
            "State-driven motion and interface feedback",
            "Accessibility and product polish",
        ],
        "featured": True,
        "color": "#ea580c",
    },
    {
        "id": 103,
        "slug": "python-api-workshop",
        "title": "Python API Workshop",
        "category": "Backend Development",
        "level": "Intermediate",
        "duration": "5 weeks",
        "price": 99,
        "rating": 4.7,
        "students": 940,
        "lessons": 28,
        "instructor": "Lina Adel",
        "headline": "Ship structured, maintainable APIs with FastAPI and clean service boundaries.",
        "description": "Go from raw endpoints to production-style APIs with validation, persistence patterns, and team-friendly architecture.",
        "skills": ["FastAPI", "Pydantic", "REST", "Architecture"],
        "modules": [
            "API contracts and request validation",
            "Structuring business logic for growth",
            "Persistence, caching, and background tasks",
            "Operational concerns and testing",
        ],
        "featured": False,
        "color": "#059669",
    },
    {
        "id": 104,
        "slug": "data-analytics-sprint",
        "title": "Data Analytics Sprint",
        "category": "Data",
        "level": "Beginner",
        "duration": "4 weeks",
        "price": 79,
        "rating": 4.6,
        "students": 520,
        "lessons": 24,
        "instructor": "Youssef Tarek",
        "headline": "Turn messy data into clear business stories and dashboards.",
        "description": "Learn analysis workflows, metrics thinking, SQL habits, and visualization choices that support decision-making.",
        "skills": ["SQL", "Dashboards", "Metrics", "Storytelling"],
        "modules": [
            "Thinking in metrics and questions",
            "Cleaning and shaping data",
            "Dashboards that explain instead of decorate",
            "Presenting insight to teams",
        ],
        "featured": False,
        "color": "#7c3aed",
    },
]


@app.get("/")
def root():
    return {
        **SERVICE_METADATA,
        "capabilities": ["course-listing", "featured-courses", "course-details"],
    }


@app.get("/health")
def health():
    return {
        **SERVICE_METADATA,
        "dependencies": [],
    }


@app.get("/courses")
def get_courses(
    category: Optional[str] = None,
    level: Optional[str] = None,
    featured: Optional[bool] = None,
    search: Optional[str] = None,
    limit: int = Query(default=len(COURSES), ge=1, le=24),
):
    courses = COURSES

    if category:
        category_normalized = category.strip().lower()
        courses = [
            course for course in courses if course["category"].strip().lower() == category_normalized
        ]

    if level:
        level_normalized = level.strip().lower()
        courses = [course for course in courses if course["level"].strip().lower() == level_normalized]

    if featured is not None:
        courses = [course for course in courses if course["featured"] is featured]

    if search:
        search_normalized = search.strip().lower()
        courses = [
            course
            for course in courses
            if search_normalized in course["title"].lower()
            or search_normalized in course["headline"].lower()
            or search_normalized in course["description"].lower()
            or any(search_normalized in skill.lower() for skill in course["skills"])
        ]

    limited_courses = courses[:limit]
    return {
        "items": limited_courses,
        "count": len(limited_courses),
        "total": len(courses),
        "filters": {
            "category": category,
            "level": level,
            "featured": featured,
            "search": search,
        },
    }


@app.get("/courses/featured")
def get_featured_courses():
    featured_courses = [course for course in COURSES if course["featured"]]
    return {
        "items": featured_courses,
        "count": len(featured_courses),
    }


@app.get("/categories")
def get_categories():
    categories = sorted({course["category"] for course in COURSES})
    return {
        "items": [{"name": category} for category in categories],
        "count": len(categories),
    }


@app.get("/courses/{course_id}")
def get_course(course_id: int):
    course = next((course for course in COURSES if course["id"] == course_id), None)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@app.get("/courses/slug/{slug}")
def get_course_by_slug(slug: str):
    slug_normalized = slug.strip().lower()
    course = next((course for course in COURSES if course["slug"].lower() == slug_normalized), None)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course
