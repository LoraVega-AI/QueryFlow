
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Post } from './Post';
import { User } from './User';

@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  postId: number;

  @Column()
  userId: number;

  @Column('text')
  content: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ManyToOne(() => Post, post => post.comments)
  @JoinColumn({ name: 'postId' })
  post: Post;

  @ManyToOne(() => User, user => user.comments)
  @JoinColumn({ name: 'userId' })
  user: User;
}
