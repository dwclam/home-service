import { Header, Footer } from './components/Layout'
import { Hero } from './components/Hero'
import { Categories, CompletedTasks, FeaturedServices, HowItWorks, TopProviders, ProviderCallout } from './components/HomeSections'
import './App.css'

function App() {
  return <>
    <Header />
    <main>
      <Hero />
      <Categories />
      <CompletedTasks />
      <FeaturedServices />
      <HowItWorks />
      <TopProviders />
      <ProviderCallout />
    </main>
    <Footer />
  </>
}

export default App
