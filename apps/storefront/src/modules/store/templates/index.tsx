import MenuTemplate from "@modules/menu/templates"

const StoreTemplate = ({
  countryCode,
}: {
  sortBy?: string
  page?: string
  countryCode: string
  optionValueIds?: unknown
}) => {
  return <MenuTemplate countryCode={countryCode} />
}

export default StoreTemplate
