import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  List, 
  ListOrdered, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Heading1, 
  Heading2,
  Heading3,
  ChevronDown,
  TextIcon,
  Type
} from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Input } from './ui/input';
import { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { Label } from './ui/label';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  className?: string;
}

export const RichTextEditor = ({ content, onChange, className }: RichTextEditorProps) => {
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Image,
      Link.configure({
        openOnClick: false,
      }),
      TextStyle,
      Color,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) {
    return null;
  }

  const addLink = () => {
    if (linkUrl) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
      setLinkUrl('');
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    }
  };

  const addImage = () => {
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setImageUrl('');
    }
  };

  const setHeading = (level: 1 | 2 | 3) => {
    editor.chain().focus().toggleHeading({ level }).run();
  };

  return (
    <div className={cn("border border-input rounded-md overflow-hidden", className)}>
      <div className="flex flex-wrap gap-1 p-2 bg-muted/40 border-b">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'bg-muted' : ''}
          type="button"
        >
          <Bold className="h-4 w-4" />
        </Button>
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'bg-muted' : ''}
          type="button"
        >
          <Italic className="h-4 w-4" />
        </Button>
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive('underline') ? 'bg-muted' : ''}
          type="button"
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" type="button">
              <Type className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().run()}>
              <TextIcon className="h-4 w-4 mr-2" />
              <span>Paragraph</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setHeading(1)}>
              <Heading1 className="h-4 w-4 mr-2" />
              <span>Heading 1</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setHeading(2)}>
              <Heading2 className="h-4 w-4 mr-2" />
              <span>Heading 2</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setHeading(3)}>
              <Heading3 className="h-4 w-4 mr-2" />
              <span>Heading 3</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'bg-muted' : ''}
          type="button"
        >
          <List className="h-4 w-4" />
        </Button>
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'bg-muted' : ''}
          type="button"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className={editor.isActive('link') ? 'bg-muted' : ''}
              type="button"
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-2">
              <Label htmlFor="link-url">Link URL</Label>
              <div className="flex space-x-2">
                <Input
                  id="link-url"
                  placeholder="https://example.com"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                />
                <Button 
                  onClick={addLink}
                  size="sm"
                  type="button"
                >
                  Add
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              type="button"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-2">
              <Label htmlFor="image-url">Image URL</Label>
              <div className="flex space-x-2">
                <Input
                  id="image-url"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
                <Button 
                  onClick={addImage}
                  size="sm"
                  type="button"
                >
                  Add
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      <EditorContent 
        editor={editor} 
        className="p-4 min-h-[200px] max-h-[400px] overflow-y-auto focus-within:outline-none"
      />
      
      {editor && (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
          <div className="flex bg-background border rounded-md shadow-md">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={editor.isActive('bold') ? 'bg-muted' : ''}
              type="button"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={editor.isActive('italic') ? 'bg-muted' : ''}
              type="button"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={editor.isActive('underline') ? 'bg-muted' : ''}
              type="button"
            >
              <UnderlineIcon className="h-4 w-4" />
            </Button>
          </div>
        </BubbleMenu>
      )}
    </div>
  );
};