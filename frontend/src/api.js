import axios from 'axios'

const frontendEnv = import.meta.env

const serviceBaseUrls = {
  catalog: frontendEnv.VITE_CATALOG_API_URL || 'http://localhost:8000',
  learningList: frontendEnv.VITE_LEARNING_LIST_API_URL || 'http://localhost:8001',
  enrollments: frontendEnv.VITE_ENROLLMENTS_API_URL || 'http://localhost:8002',
  auth: frontendEnv.VITE_AUTH_API_URL || 'http://localhost:8003',
}

const catalogApi = axios.create({ baseURL: serviceBaseUrls.catalog })
const learningListApi = axios.create({ baseURL: serviceBaseUrls.learningList })
const enrollmentsApi = axios.create({ baseURL: serviceBaseUrls.enrollments })
const authApi = axios.create({ baseURL: serviceBaseUrls.auth })

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function fetchCourses(filters = {}) {
  const response = await catalogApi.get('/courses', { params: filters })
  return response.data
}

export async function fetchFeaturedCourses() {
  const response = await catalogApi.get('/courses/featured')
  return response.data
}

export async function fetchCategories() {
  const response = await catalogApi.get('/categories')
  return response.data
}

export async function fetchLearningList(userId) {
  const response = await learningListApi.get(`/learning-list/${userId}`)
  return response.data
}

export async function saveCourseToLearningList(userId, course) {
  const response = await learningListApi.post(`/learning-list/${userId}`, {
    course_id: course.id,
    title: course.title,
    category: course.category,
    instructor: course.instructor,
    price: course.price,
    level: course.level,
    duration: course.duration,
  })
  return response.data
}

export async function removeCourseFromLearningList(userId, courseId) {
  const response = await learningListApi.delete(`/learning-list/${userId}/${courseId}`)
  return response.data
}

export async function clearLearningList(userId) {
  const response = await learningListApi.delete(`/learning-list/${userId}`)
  return response.data
}

export async function fetchEnrollments(userId) {
  const response = await enrollmentsApi.get(`/enrollments/${userId}`)
  return response.data
}

export async function createEnrollment(userId, course) {
  const response = await enrollmentsApi.post('/enrollments', {
    user_id: userId,
    course_id: course.id ?? course.course_id,
    course_title: course.title ?? course.course_title,
    category: course.category,
    instructor: course.instructor,
  })
  return response.data
}

export async function updateEnrollmentProgress(enrollmentId, progress) {
  const response = await enrollmentsApi.patch(`/enrollments/${enrollmentId}/progress`, { progress })
  return response.data
}

export async function registerUser(payload) {
  const response = await authApi.post('/auth/register', payload)
  return response.data
}

export async function loginUser(payload) {
  const response = await authApi.post('/auth/login', payload)
  return response.data
}

export async function fetchCurrentUser(token) {
  const response = await authApi.get('/auth/me', {
    headers: authHeaders(token),
  })
  return response.data
}

export async function fetchServiceStatus(token) {
  const services = [
    { key: 'catalog', url: `${serviceBaseUrls.catalog}/health` },
    { key: 'learning-list', url: `${serviceBaseUrls.learningList}/health` },
    { key: 'enrollments', url: `${serviceBaseUrls.enrollments}/health` },
    { key: 'auth', url: `${serviceBaseUrls.auth}/health`, headers: authHeaders(token) },
  ]

  const results = await Promise.allSettled(
    services.map((service) => axios.get(service.url, { headers: service.headers })),
  )

  return results.map((result, index) => {
    const service = services[index]

    if (result.status === 'fulfilled') {
      return {
        key: service.key,
        state: 'online',
        data: result.value.data,
      }
    }

    return {
      key: service.key,
      state: 'offline',
      error: result.reason?.response?.data?.error ?? result.reason?.message ?? 'Unavailable',
    }
  })
}
