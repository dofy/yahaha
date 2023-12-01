import { ChangeEvent } from 'react'

export interface NumberInputProps {
  value?: string
  onChange?: (value: ChangeEvent<HTMLInputElement>) => void
}
const NumberInput = (props: NumberInputProps) => {
  const { value, onChange } = props
  return (
    <input
      min={1}
      max={13}
      type='number'
      maxLength={2}
      name='num'
      placeholder='XX'
      className='number-input'
      value={value}
      onChange={onChange}
    />
  )
}

export default NumberInput
