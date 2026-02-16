import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

interface TypewriterInputProps {
    suggestions: string[];
    onSearch: (term: string) => void;
}

const TypewriterInput: React.FC<TypewriterInputProps> = ({
    suggestions,
    onSearch,
}) => {
    const placeholders =
        suggestions.length > 0
            ? suggestions
            : ["Search for 'AI Native FullStack Developer'...", "Search for 'Machine Learning Basics'...", "Search for 'Full Stack Development'..."];
    const [currentText, setCurrentText] = useState("");
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);
    const [loopNum, setLoopNum] = useState(0);
    const [inputValue, setInputValue] = useState("");
    const typingSpeed = 100;
    const deletingSpeed = 50;
    const pauseTime = 2000;

    useEffect(() => {
        const handleTyping = () => {
            const i = loopNum % placeholders.length;
            const fullText = placeholders[i];

            if (isDeleting) {
                setCurrentText(fullText.substring(0, currentText.length - 1));
            } else {
                setCurrentText(fullText.substring(0, currentText.length + 1));
            }

            if (!isDeleting && currentText === fullText) {
                setTimeout(() => setIsDeleting(true), pauseTime);
            } else if (isDeleting && currentText === "") {
                setIsDeleting(false);
                setLoopNum(loopNum + 1);
            }
        };

        const timer = setTimeout(handleTyping, isDeleting ? deletingSpeed : typingSpeed);
        return () => clearTimeout(timer);
    }, [currentText, isDeleting, loopNum, placeholders]);

    return (
        <form
            className="relative max-w-3xl w-full mt-8"
            onSubmit={(event) => {
                event.preventDefault();
                const term = (inputValue || currentText).trim();
                if (term) {
                    onSearch(term);
                }
            }}
        >
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                <Search className="h-6 w-6 text-[#90AEAD]" />
            </div>
            <input
                type="text"
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder={currentText}
                className="w-full py-5 pl-14 pr-16 text-lg text-[#244855] bg-white/80 backdrop-blur-md border border-[#90AEAD]/40 rounded-2xl shadow-[0_10px_30px_rgba(36,72,85,0.18)] focus:outline-none focus:ring-2 focus:ring-[#E64833]/60 transition-all placeholder:text-[#90AEAD]"
            />
            <div className="absolute inset-y-0 right-3 flex items-center">
                <button
                    type="submit"
                    className="bg-[#E64833] hover:bg-[#c93b29] text-white p-3 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-[0_6px_18px_rgba(230,72,51,0.3)]"
                >
                    <Search className="h-5 w-5" />
                </button>
            </div>
        </form>
    );
};

export default TypewriterInput;
