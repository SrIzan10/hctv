'use client'

import { Button, buttonVariants } from "@/components/ui/button"
import { VariantProps } from "class-variance-authority"
import { useFormStatus } from "react-dom"

export default function SubmitButton(props: Props) {
    const { pending } = useFormStatus()
    const { buttonText, ...propsRest } = props
    return (
        <Button type="submit" loading={pending} {...propsRest}>
            {props.buttonText}
        </Button>
    )
}

export interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
    buttonText: string;
}
