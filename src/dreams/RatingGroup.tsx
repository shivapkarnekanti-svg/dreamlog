import { useId } from 'react'

/** 1 to 5 radio buttons. Choosing the selected one again clears it, since the rating is optional. */
export function RatingGroup(props: {
  legend: string
  value: number | null
  onChange: (next: number | null) => void
}) {
  const name = useId()
  return (
    <fieldset className="dreams__group">
      <legend>{props.legend}</legend>
      <div className="dreams__rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="dreams__choice">
            <input
              type="radio"
              name={name}
              value={n}
              checked={props.value === n}
              onChange={() => props.onChange(n)}
              onClick={() => props.value === n && props.onChange(null)}
            />
            <span>{n}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
