// https://v0.dev/r/DxCSk58T8pM
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <main className="flex-1">
          <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
            <div className="container px-4 md:px-6">
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                    The modern tech stack for your next(.js) project
                  </h1>
                  <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                    stack is a comprehensive tech stack that includes everything you need to build and deploy your next
                    web application.
                  </p>
                </div>
                <div className="space-x-4">
                  <Link href="https://github.com/SrIzan10/stack">
                    <Button>Start right NOW!</Button>
                  </Link>
                </div>
              </div>
            </div>
          </section>
          <section className="w-full py-12 md:py-24 lg:py-32 bg-mantle" id="features">
            <div className="container px-4 md:px-6">
              <div className="flex flex-col items-center justify-center space-y-4 text-center">
                <div className="space-y-2">
                  <div className="inline-block rounded-lg bg-gray-100 px-3 py-1 text-sm dark:bg-gray-800">
                    Key Features
                  </div>
                  <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                    Everything you need to build and deploy
                  </h2>
                  <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                    Stack is a comprehensive tech stack that includes everything you need to build and deploy your next
                    web application.
                  </p>
                </div>
              </div>
              <div className="mx-auto max-w-5xl items-center gap-6 py-12 lg:grid-cols-2 lg:gap-12">
                <div className="flex flex-col justify-center items-center text-center space-y-4">
                  <ul className="grid gap-6">
                    <li>
                      <div className="grid gap-1">
                        <h3 className="text-xl font-bold">Next.js</h3>
                        <p className="text-gray-500 dark:text-gray-400">
                          Build server-rendered React applications with Next.js.
                        </p>
                      </div>
                    </li>
                    <li>
                      <div className="grid gap-1">
                        <h3 className="text-xl font-bold">Prisma</h3>
                        <p className="text-gray-500 dark:text-gray-400">
                          Access your database with Prisma, the best way to work with databases in Ethan&apos;s opinion
                        </p>
                      </div>
                    </li>
                    <li>
                      <div className="grid gap-1">
                        <h3 className="text-xl font-bold">Tailwind CSS</h3>
                        <p className="text-gray-500 dark:text-gray-400">
                          Style your application with Tailwind CSS, the utility-first CSS framework.
                        </p>
                      </div>
                    </li>
                    <li>
                      <div className="grid gap-1">
                        <h3 className="text-xl font-bold">shadcn/ui</h3>
                        <p className="text-gray-500 dark:text-gray-400">
                          The customizability of the components makes it one of the best UI libraries out there.
                        </p>
                      </div>
                    </li>
                    <li>
                      <div className="grid gap-1">
                        <h3 className="text-xl font-bold">Vercel</h3>
                        <p className="text-gray-500 dark:text-gray-400">
                          Deploy your application to the cloud with Vercel, the serverless platform.
                        </p>
                      </div>
                    </li>
                    <li>
                      <div className="grid gap-1">
                          <h3 className="text-xl font-bold">Lucia</h3>
                          <p className="text-gray-500 dark:text-gray-400">
                            Manage authentication with Lucia auth, the best selfhosted authentication library.
                          </p>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
        </main>
      </>
  );
}
