import { Hero } from '../../components/Hero'
import {
  Categories,
  CompletedTasks,
  FeaturedServices,
  HowItWorks,
  TopProviders,
  ProviderCallout,
} from '../../components/HomeSections'

export const HomePage = () => {
  return (
    <>
      <Hero />
      <Categories />
      <CompletedTasks />
      <FeaturedServices />
      <HowItWorks />
      <TopProviders />
      <ProviderCallout />
    </>
  )
}

export default HomePage
