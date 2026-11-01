import { createBrowserRouter } from 'react-router'
import { RootLayout } from './components/layout/RootLayout'
import { HomePage } from './pages/HomePage'
import { PostPage } from './pages/PostPage'
import { ReferencesPage } from './pages/ReferencesPage'
import { NotFoundPage } from './pages/NotFoundPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'guia/:slug', element: <PostPage /> },
      { path: 'referencias', element: <ReferencesPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
