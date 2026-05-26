import { useRef } from "react";

export function useStableRef<T>(value: T) {
	const ref = useRef(value);
	ref.current = value;
	return ref;
}
