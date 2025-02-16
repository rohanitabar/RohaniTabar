import React, { useState, useEffect } from "react";
import "./comment.css";

const Comment = () => {
  const [comments, setComments] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    text: "",
    parentId: null,
  });

  useEffect(() => {
    const savedComments = JSON.parse(localStorage.getItem("comments")) || [];
    setComments(savedComments);
  }, []);

  useEffect(() => {
    localStorage.setItem("comments", JSON.stringify(comments));
  }, [comments]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const newComment = {
      id: Date.now(),
      name: formData.name,
      email: formData.email,
      text: formData.text,
      date: new Date().toLocaleString("fa-IR"),
      likes: 0,
      replies: [],
    };

    if (formData.parentId) {
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === formData.parentId
            ? { ...comment, replies: [...comment.replies, newComment] }
            : comment
        )
      );
    } else {
      setComments((prev) => [newComment, ...prev]);
    }

    setFormData({ name: "", email: "", text: "", parentId: null });
  };

  const handleLike = (commentId) => {
    setComments((prev) =>
      prev.map((comment) =>
        comment.id === commentId
          ? { ...comment, likes: comment.likes + 1 }
          : comment
      )
    );
  };

  const CommentNode = ({ comment, depth = 0 }) => (
    <div className="comment" style={{ direction:'rtl'}}>
      <div className="comment-header">
        <div className="user-avatar">{comment.name[0]}</div>
        <div>
          <div className="comment-author">{comment.name}</div>
          <div className="comment-date">{comment.date}</div>
        </div>
      </div>
      <div className="comment-content">{comment.text}</div>
      <div className="comment-actions">
        <button className="like-btn" onClick={() => handleLike(comment.id)}>
          <i className="fas fa-heart"></i>
          <span className="likes-count">{comment.likes}</span>
        </button>
        <button
          className="reply-btn"
          onClick={() =>
            setFormData((prev) => ({ ...prev, parentId: comment.id }))
          }
        >
          <i className="fas fa-reply"></i> پاسخ
        </button>
      </div>
      {comment.replies.map((reply) => (
        <CommentNode key={reply.id} comment={reply} depth={depth + 1} />
      ))}
    </div>
  );

  return (
    <div className="comment-section">
      <form className="comment-form" onSubmit={handleSubmit}>
        {formData.parentId && (
          <button
            type="button"
            className="cancel-reply btn btn-danger mb-3"
            onClick={() => setFormData((prev) => ({ ...prev, parentId: null }))}
          >
            لغو پاسخ
          </button>
        )}
        <div className="form-group">
          <input
            type="text"
            placeholder="نام شما *"
            required
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
          />
        </div>
        <div className="form-group">
          <input
            type="email"
            placeholder="ایمیل شما (اختیاری)"
            value={formData.email}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, email: e.target.value }))
            }
            style={{direction:'rtl'}}
          />
        </div>
        <div className="form-group">
          <textarea
            rows={formData.parentId ? 2 : 4}
            placeholder={formData.parentId ? "پاسخ شما *" : "نظر شما *"}
            required
            value={formData.text}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, text: e.target.value }))
            }
          />
        </div>
        <button type="submit" className="submit-btn">
          {formData.parentId ? "ارسال پاسخ" : "ارسال نظر"}
        </button>
      </form>

      <div id="comments-container">
        {comments.map((comment) => (
          <CommentNode key={comment.id} comment={comment} />
        ))}
      </div>
    </div>
  );
};

export default Comment;
