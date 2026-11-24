import { Hero } from '../../components/Hero'
import {
  Categories,
  FeaturedServices,
  HowItWorks,
  ProviderCallout,
} from '../../components/HomeSections'

export const HomePage = () => {
  return (
    <>
      <Hero />
      <Categories />
      <FeaturedServices />
      <HowItWorks />
      <ProviderCallout />
    </>
  )
}

export default HomePage
