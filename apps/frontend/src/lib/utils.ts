type PrimitiveClassValue = string | number | boolean | null | undefined
type ClassDictionary = Record<string, boolean | null | undefined>
type ClassArray = ClassValue[]
type ClassValue = PrimitiveClassValue | ClassDictionary | ClassArray

function normalizeClassValue(value: ClassValue): string[] {
  const classNames: string[] = []

  const visit = (current: ClassValue): void => {
    if (current === null || current === undefined || current === false) return

    if (typeof current === 'string' || typeof current === 'number') {
      const className = String(current)
      if (className) classNames.push(className)
      return
    }

    if (Array.isArray(current)) {
      current.forEach((item) => visit(item))
      return
    }

    Object.entries(current).forEach(([className, enabled]) => {
      if (enabled) classNames.push(className)
    })
  }

  visit(value)
  return classNames
}

export function cn(...classes: ClassValue[]): string {
  return classes
    .flatMap((classValue) => normalizeClassValue(classValue))
    .filter(Boolean)
    .join(' ')
}
