// app/page.js
export default function Home() {
    return (
      <main className="flex min-h-screen flex-col items-center justify-between p-24">
        <h1>Welcome to Next.js</h1>
      </main>
    )
  }
  
  // app/layout.js
  export default function RootLayout({ children }) {
    return (
      <html lang="en">
        <body>{children}</body>
      </html>
    )
  }